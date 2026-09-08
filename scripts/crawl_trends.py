#!/usr/bin/env python3
"""
Automated Trend Ingestion for PlonkMemes.
Crawls trending/top viral sounds from MyInstants Brazil, detects new entries
not yet in PlonkMemes catalog, normalizes audio to EBU R128 (-16 LUFS, 44.1kHz, 192k),
uploads to Supabase Storage, and updates sounds.json & initial-sounds.ts.
"""

import os
import sys
import re
import json
import time
import argparse
import subprocess
import urllib.request
import urllib.error
from bs4 import BeautifulSoup

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JSON = os.path.join(BASE_DIR, "app", "data", "sounds.json")
DATA_TS = os.path.join(BASE_DIR, "app", "data", "initial-sounds.ts")
PUBLIC_SOUNDS_DIR = os.path.join(BASE_DIR, "public", "sounds")
TEMP_DIR = "/tmp/plonk_trends"

# Supabase Credentials
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://bfwdlanqfokvmxhzfdie.supabase.co")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmd2RsYW5xZm9rdm14aHpmZGllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc5Mzg1NywiZXhwIjoyMTA0MzY5ODU3fQ.n6b0zpr1zb67a-nn9SHtk88aPtx0JKcvZlh9CJjdz34")
BUCKET = "sounds"

SOURCES = [
    ("https://www.myinstants.com/pt/index/br/", "memes"),
    ("https://www.myinstants.com/pt/index/br/?page=2", "memes"),
    ("https://www.myinstants.com/pt/index/br/?page=3", "memes"),
    ("https://www.myinstants.com/pt/recent/", "memes"),
    ("https://www.myinstants.com/pt/categories/memes/", "memes"),
    ("https://www.myinstants.com/pt/categories/games/", "games"),
]

COLOR_PALETTE = [
    "#E11D48", "#8B5CF6", "#0EA5E9", "#F59E0B", "#10B981",
    "#EC4899", "#6366F1", "#EF4444", "#14B8A6", "#EAB308",
    "#06B6D4", "#84CC16", "#F97316", "#D946EF", "#64748B"
]

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.myinstants.com/"
}

def fetch_html(url):
    req = urllib.request.Request(url, headers=HTTP_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        print(f"⚠️ Erro ao acessar {url}: {e}")
        return ""

def parse_instants(html, default_cat):
    soup = BeautifulSoup(html, "html.parser")
    items = []
    
    for inst in soup.find_all("div", class_="instant"):
        link = inst.find("a", class_="instant-link")
        btn = inst.find("button", class_="small-button")
        if not link or not btn:
            continue
            
        onclick = btn.get("onclick", "")
        m = re.search(r"play\(['\"](/media/sounds/[^'\"]+)['\"],\s*['\"][^'\"]*['\"],\s*['\"]([^'\"]+)['\"]\)", onclick)
        if not m:
            continue
            
        rel_audio_url = m.group(1)
        slug_id = m.group(2)
        title = link.text.strip()
        audio_url = f"https://www.myinstants.com{rel_audio_url}"
        
        items.append({
            "id": slug_id,
            "title": title,
            "slug": slug_id,
            "raw_audio_url": audio_url,
            "category": default_cat
        })
        
    return items

def normalize_and_measure(src_path, dest_path):
    cmd = [
        'ffmpeg', '-y', '-nostats', '-i', src_path,
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
        '-ar', '44100', '-b:a', '192k', dest_path
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

    dur_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", dest_path]
    raw_dur = subprocess.check_output(dur_cmd).decode('utf-8').strip()
    duration = round(float(raw_dur), 2)
    
    return duration, {
        "standard": "EBU R128",
        "target_lufs": -16.0,
        "integrated_lufs": integrated_lufs,
        "true_peak_dbtp": true_peak_dbtp,
        "loudness_range_lra": loudness_range_lra
    }

def upload_to_supabase(filepath, filename):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{filename}"
    with open(filepath, "rb") as f:
        data = f.read()
        
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "audio/mpeg",
            "x-upsert": "true",
            "cache-control": "public, max-age=31536000, immutable"
        },
        method="POST"
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                if resp.status in (200, 201):
                    return True
        except Exception as e:
            if attempt == 2:
                print(f"❌ Falha no upload Supabase de {filename}: {e}")
                return False
            time.sleep(1)
    return False

def categorize_sound(title, slug):
    text = f"{title} {slug}".lower()
    if any(k in text for k in ["game", "zelda", "mario", "minecraft", "fortnite", "mk", "kombat", "valorant", "gta", "cs", "fifa", "lol", "roblox"]):
        return "games"
    elif any(k in text for k in ["chaves", "globo", "sbt", "faustao", "ratinho", "faro", "filme", "serie", "anime", "desenho"]):
        return "tv-filmes"
    elif any(k in text for k in ["alarme", "notificacao", "trompete", "risada", "efeito", "tiro", "buzina", "explosao", "punch"]):
        return "efeitos"
    elif any(k in text for k in ["streamer", "caze", "casimiro", "alanzoka", "cellbit", "gaules", "nobru", "coringa", "monark"]):
        return "streamers"
    elif any(k in text for k in ["musica", "funk", "remix", "beat", "trap", "hino"]):
        return "musica"
    elif any(k in text for k in ["cala a boca", "receba", "bora bill", "calabreso", "que isso", "mentira", "e o pix", "tome"]):
        return "bordoes"
    return "memes"

def main():
    parser = argparse.ArgumentParser(description="PlonkMemes automated trend crawler")
    parser.add_argument("--dry-run", action="store_true", help="Run without downloading or modifying catalog")
    parser.add_argument("--max-items", type=int, default=10, help="Maximum new items to ingest per run")
    args = parser.parse_args()

    os.makedirs(TEMP_DIR, exist_ok=True)
    os.makedirs(PUBLIC_SOUNDS_DIR, exist_ok=True)

    with open(DATA_JSON, "r") as f:
        catalog = json.load(f)

    existing_ids = set(s["id"] for s in catalog)
    existing_slugs = set(s.get("slug", "") for s in catalog)
    print(f"📚 Catálogo atual: {len(catalog)} sons cadastrados.")

    print("🔍 Rastreando tendências no MyInstants...")
    candidate_items = []
    seen_in_run = set()

    for url, cat in SOURCES:
        html = fetch_html(url)
        if not html:
            continue
        items = parse_instants(html, cat)
        print(f"  • {url}: {len(items)} sons encontrados.")
        for item in items:
            sid = item["id"]
            if sid not in existing_ids and sid not in existing_slugs and sid not in seen_in_run:
                seen_in_run.add(sid)
                candidate_items.append(item)

    print(f"✨ Encontrados {len(candidate_items)} potenciais novos virais.")
    if not candidate_items:
        print("✅ Catálogo já está 100% atualizado com as tendências. Nenhuma ação necessária.")
        return

    to_process = candidate_items[:args.max_items]
    print(f"🚀 Processando os top {len(to_process)} novos sons...")

    if args.dry_run:
        print("\n[DRY RUN] Novos sons que seriam ingeridos:")
        for idx, item in enumerate(to_process, 1):
            print(f"  {idx}. {item['title']} (ID: {item['id']}) -> {item['raw_audio_url']}")
        return

    newly_added = []

    for idx, item in enumerate(to_process, 1):
        sid = item["id"]
        title = item["title"]
        raw_url = item["raw_audio_url"]
        temp_raw = os.path.join(TEMP_DIR, f"raw_{sid}.mp3")
        temp_norm = os.path.join(TEMP_DIR, f"norm_{sid}.mp3")
        final_public = os.path.join(PUBLIC_SOUNDS_DIR, f"{sid}.mp3")

        print(f"\n[{idx}/{len(to_process)}] Baixando: {title} ({sid})...")
        try:
            req = urllib.request.Request(raw_url, headers=HTTP_HEADERS)
            with urllib.request.urlopen(req, timeout=12) as resp:
                content = resp.read()
                if len(content) < 800:
                    print("  ⚠️ Arquivo muito pequeno ou vazio, pulando.")
                    continue
                with open(temp_raw, "wb") as f:
                    f.write(content)
        except Exception as e:
            print(f"  ⚠️ Falha no download: {e}")
            continue

        try:
            duration, loudness_metrics = normalize_and_measure(temp_raw, temp_norm)
            if duration > 35.0:
                print(f"  ⚠️ Áudio muito longo ({duration}s > 35s), pulando.")
                continue
        except Exception as e:
            print(f"  ⚠️ Falha ao normalizar áudio: {e}")
            continue

        try:
            with open(temp_norm, "rb") as sf, open(final_public, "wb") as df:
                df.write(sf.read())
        except Exception as e:
            print(f"  ⚠️ Falha ao copiar para public/sounds: {e}")

        cdn_filename = f"{sid}.mp3"
        print(f"  ☁️ Fazendo upload para Supabase Storage ({cdn_filename})...")
        uploaded = upload_to_supabase(temp_norm, cdn_filename)
        if not uploaded:
            print("  ⚠️ Falha no upload CDN, pulando.")
            continue

        cdn_direct_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{cdn_filename}"
        category = categorize_sound(title, sid)
        color = COLOR_PALETTE[len(catalog) % len(COLOR_PALETTE)]
        tags = [w.lower() for w in re.split(r'[\s\-_,.]+', title) if len(w) > 2]

        new_sound = {
            "id": sid,
            "title": title,
            "name": title,
            "slug": sid,
            "audioUrl": cdn_direct_url,
            "category": category,
            "color": color,
            "plays": 0,
            "duration": duration,
            "tags": tags,
            "isTrending": True,
            "loudness": loudness_metrics
        }

        catalog.insert(0, new_sound)
        newly_added.append(new_sound)
        print(f"  ✅ Adicionado com sucesso! Duração: {duration}s | LUFS: {loudness_metrics['integrated_lufs']}")

    if not newly_added:
        print("\nNenhum som qualificado pôde ser adicionado.")
        return

    print(f"\n💾 Salvando catálogo atualizado ({len(catalog)} sons)...")
    with open(DATA_JSON, "w") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)

    with open(DATA_TS, "w") as f:
        f.write('import { SoundItem } from "../types";\n\n')
        f.write('export const INITIAL_SOUNDS: SoundItem[] = ')
        f.write(json.dumps(catalog, indent=2, ensure_ascii=False))
        f.write(';\n')

    print(f"🎉 Sucesso! {len(newly_added)} novos sons de tendência integrados ao PlonkMemes.")

if __name__ == "__main__":
    main()
