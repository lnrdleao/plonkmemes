#!/usr/bin/env python3
import os
import sys
import json
import shutil
import subprocess
from concurrent.futures import ProcessPoolExecutor, as_completed

SOUNDS_DIR = "/home/leonardo/.openclaw/workspace/memesounds/public/sounds"
DATA_JSON = "/home/leonardo/.openclaw/workspace/memesounds/app/data/sounds.json"

with open(DATA_JSON) as f:
    sounds = json.load(f)

# Find sounds outside [-18, -14]
outliers = []
for s in sounds:
    l = s.get('loudness', {})
    i = l.get('integrated_lufs', -16.0)
    if i != -70.0 and (i > -14.0 or i < -18.0):
        outliers.append(s)

print(f"Encontrados {len(outliers)} sons com dispersão > ±2 LUFS para refinar em dois passes...")

def twopass_normalize(sound):
    sid = sound['id']
    src = os.path.join(SOUNDS_DIR, f"{sid}.mp3")
    if not os.path.exists(src):
        return sid, None

    # Pass 1: Measure exact stats
    cmd1 = [
        'ffmpeg', '-nostats', '-y', '-i', src,
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
        '-f', 'null', '-'
    ]
    p1 = subprocess.run(cmd1, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, errors='replace')
    idx1 = p1.stderr.rfind('{')
    if idx1 == -1:
        return sid, None
    try:
        stats = json.loads(p1.stderr[idx1:p1.stderr.rfind('}')+1])
    except:
        return sid, None

    # Pass 2: Apply linear normalization with measured parameters
    tmp_out = f"/tmp/twopass_{sid}.mp3"
    filter_pass2 = (
        f"loudnorm=I=-16:TP=-1.5:LRA=11:"
        f"measured_I={stats.get('input_i', -16)}:"
        f"measured_TP={stats.get('input_tp', -1.5)}:"
        f"measured_LRA={stats.get('input_lra', 11)}:"
        f"measured_thresh={stats.get('input_thresh', -26)}:"
        f"offset={stats.get('target_offset', 0)}:linear=true:print_format=json"
    )

    cmd2 = [
        'ffmpeg', '-nostats', '-y', '-i', src,
        '-af', filter_pass2,
        '-ar', '44100', '-b:a', '192k', tmp_out
    ]
    p2 = subprocess.run(cmd2, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, errors='replace')
    
    idx2 = p2.stderr.rfind('{')
    final_lufs = -16.0
    final_tp = -1.5
    final_lra = 1.0
    if idx2 != -1:
        try:
            out_stats = json.loads(p2.stderr[idx2:p2.stderr.rfind('}')+1])
            final_lufs = round(float(out_stats.get('output_i', -16.0)), 2)
            final_tp = round(float(out_stats.get('output_tp', -1.5)), 2)
            final_lra = round(float(out_stats.get('output_lra', 1.0)), 2)
        except:
            pass

    if os.path.exists(tmp_out) and os.path.getsize(tmp_out) > 500:
        shutil.move(tmp_out, src)
        return sid, {
            "integrated_lufs": final_lufs,
            "true_peak_dbtp": final_tp,
            "loudness_range_lra": final_lra
        }
    return sid, None

results = {}
with ProcessPoolExecutor(max_workers=4) as executor:
    futures = {executor.submit(twopass_normalize, s): s for s in outliers}
    for fut in as_completed(futures):
        sid, res = fut.result()
        if res:
            results[sid] = res

# Update sounds.json
for s in sounds:
    if s['id'] in results:
        s['loudness']['integrated_lufs'] = results[s['id']]['integrated_lufs']
        s['loudness']['true_peak_dbtp'] = results[s['id']]['true_peak_dbtp']
        s['loudness']['loudness_range_lra'] = results[s['id']]['loudness_range_lra']

with open(DATA_JSON, 'w', encoding='utf-8') as f:
    json.dump(sounds, f, ensure_ascii=False, indent=2)

print(f"🎉 Refinamento de dois passes concluído com sucesso em {len(results)} arquivos!")
