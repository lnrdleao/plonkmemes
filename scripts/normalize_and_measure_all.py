#!/usr/bin/env python3
import os
import sys
import json
import time
import shutil
import subprocess
import mutagen.mp3
from concurrent.futures import ProcessPoolExecutor, as_completed

SOUNDS_DIR = "/home/leonardo/.openclaw/workspace/memesounds/public/sounds"
DATA_JSON = "/home/leonardo/.openclaw/workspace/memesounds/app/data/sounds.json"
TEMP_DIR = "/tmp/normalized_sounds"

os.makedirs(TEMP_DIR, exist_ok=True)

def process_one_sound(sound):
    sid = sound['id']
    src = os.path.join(SOUNDS_DIR, f"{sid}.mp3")
    if not os.path.exists(src):
        return sid, None

    # Resume check: if already normalized with real measured values, skip re-encoding
    if (sound.get('loudness') and 
        sound['loudness'].get('integrated_lufs') != -16.0 and 
        sound.get('duration') and 
        sound['duration'] != 2.0):
        return sid, {
            "duration": sound['duration'],
            "loudness": sound['loudness']
        }

    try:
        # 1. Exact Duration via mutagen
        try:
            info = mutagen.mp3.MP3(src).info
            duration = round(info.length, 2)
        except Exception:
            duration = sound.get('duration', 2.0)

        # 2. FFmpeg EBU R128 Normalization (-16 LUFS, -1.5 TruePeak, 44.1kHz, 192k)
        tmp_out = os.path.join(TEMP_DIR, f"{sid}.mp3")
        cmd = [
            'ffmpeg', '-y', '-nostats', '-i', src,
            '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
            '-ar', '44100', '-b:a', '192k', tmp_out
        ]

        p = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, errors='replace')
        stderr = p.stderr or ""

        integrated_lufs = -16.0
        true_peak_dbtp = -1.5
        loudness_range_lra = 1.0

        idx = stderr.rfind('{')
        if idx != -1:
            try:
                data = json.loads(stderr[idx:stderr.rfind('}')+1])
                integrated_lufs = round(float(data.get('output_i', -16.0)), 2)
                true_peak_dbtp = round(float(data.get('output_tp', -1.5)), 2)
                loudness_range_lra = round(float(data.get('output_lra', 1.0)), 2)
            except Exception:
                pass

        # Move normalized file over original if successful
        if os.path.exists(tmp_out) and os.path.getsize(tmp_out) > 500:
            shutil.move(tmp_out, src)
            try:
                new_info = mutagen.mp3.MP3(src).info
                duration = round(new_info.length, 2)
            except Exception:
                pass

        loudness_obj = {
            "standard": "EBU R128",
            "target_lufs": -16.0,
            "integrated_lufs": integrated_lufs,
            "true_peak_dbtp": true_peak_dbtp,
            "loudness_range_lra": loudness_range_lra
        }

        return sid, {
            "duration": duration,
            "loudness": loudness_obj
        }
    except Exception as e:
        print(f"Error on {sid}: {e}", file=sys.stderr)
        return sid, None

def main():
    print("🚀 Iniciando pipeline de medição real de duração e normalização EBU R128...")
    with open(DATA_JSON, "r", encoding="utf-8") as f:
        sounds = json.load(f)

    total = len(sounds)
    print(f"📦 Total de sons para processar: {total}")

    test_ids = {
        'setembro-vai-entrar-o-grosso-lula-68611',
        'pou-estourado-48183',
        'voce-nao-tem-aura-559',
        'jogo-do-botao',
        'maldito-traidor-17987'
    }
    sounds_sorted = sorted(sounds, key=lambda s: (0 if s['id'] in test_ids else (1 if s.get('isTrending') else 2)))

    start_time = time.time()
    results = {}
    completed = 0

    with ProcessPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(process_one_sound, s): s for s in sounds_sorted}

        for fut in as_completed(futures):
            sid, res = fut.result()
            if res:
                results[sid] = res
            completed += 1

            if completed % 50 == 0 or completed == total or completed <= 10:
                elapsed = time.time() - start_time
                rate = completed / elapsed if elapsed > 0 else 0
                remaining = (total - completed) / rate if rate > 0 else 0
                print(f"  [{completed:4d}/{total}] Concluídos ({rate:.1f} sons/s | Restante: {remaining/60:.1f} min)")

                if completed % 100 == 0 or completed == total:
                    for s in sounds:
                        if s['id'] in results:
                            s['duration'] = results[s['id']]['duration']
                            s['loudness'] = results[s['id']]['loudness']
                    with open(DATA_JSON, "w", encoding="utf-8") as out:
                        json.dump(sounds, out, ensure_ascii=False, indent=2)

    for s in sounds:
        if s['id'] in results:
            s['duration'] = results[s['id']]['duration']
            s['loudness'] = results[s['id']]['loudness']
    with open(DATA_JSON, "w", encoding="utf-8") as out:
        json.dump(sounds, out, ensure_ascii=False, indent=2)

    elapsed = time.time() - start_time
    print(f"\n🎉 Normalização concluída em {elapsed/60:.1f} minutos!")

if __name__ == '__main__':
    main()
