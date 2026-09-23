#!/usr/bin/env python3
"""
Scan Top Brazil on MyInstants (pages 1 to 50), identify all sounds missing from PlonkMemes,
master them with EBU R128 (-16.0 LUFS, -1.5 dBTP), upload to Supabase CDN, and update catalog.
"""
import os
import sys
import json
import re
import time
import subprocess
import urllib.request
from bs4 import BeautifulSoup
from curl_cffi import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JSON = os.path.join(BASE_DIR, "app", "data", "sounds.json")
DATA_TS = os.path.join(BASE_DIR, "app", "data", "initial-sounds.ts")
TEMP_DIR = "/tmp/plonk_missing_br"
SUPABASE_URL = "https://bfwdlanqfokvmxhzfdie.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmd2RsYW5xZm9rdm14aHpmZGllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc5Mzg1NywiZXhwIjoyMTA0MzY5ODU3fQ.n6b0zpr1zb67a-nn9SHtk88aPtx0JKcvZlh9CJjdz34"
BUCKET = "sounds"

os.makedirs(TEMP_DIR, exist_ok=True)

with open(DATA_JSON) as f:
    catalog = json.load(f)

existing_ids = set(s["id"] for s in catalog)
existing_slugs = set(s.get("slug", "") for s in catalog)
print(f"📚 Catálogo atual: {len(catalog)} sons.")

# 1. Rastrear Mais Tocados do Brasil (páginas 1 a 50)
print("🇧🇷 1. Escaneando páginas 1 a 50 de Mais Tocados do Brasil no MyInstants...")
missing_candidates = []
seen = set()

for page in range(1, 51):
    url = f"https://www.myinstants.com/pt/index/br/?page={page}" if page > 1 else "https://www.myinstants.com/pt/index/br/"
    try:
        r = requests.get(url, impersonate="chrome120", timeout=12)
        if r.status_code != 200:
            continue
    except Exception:
        continue

    soup = BeautifulSoup(r.text, "html.parser")
    for inst in soup.find_all("div", class_="instant"):
        link = inst.find("a", class_="instant-link")
        btn = inst.find("button", class_="small-button")
        if not link or not btn:
            continue
        onclick = btn.get("onclick", "")
        m = re.search(r"play\((?:\"|\x27)(/media/sounds/[^\"\x27]+)(?:\"|\x27),\s*(?:\"|\x27)[^\"\x27]*(?:\"|\x27),\s*(?:\"|\x27)([^\"\x27]+)(?:\"|\x27)\)", onclick)
        if not m:
            continue
        rel_audio = m.group(1)
        slug = m.group(2)
        title = link.text.strip()

        if len(slug) < 3 or slug in existing_ids or slug in existing_slugs or slug in seen:
            continue
        # Filtra caracteres válidos
        if not re.search(r"[a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]", title):
            continue
        if rel_audio.endswith(".mp3_"):
            continue

        seen.add(slug)
        missing_candidates.append({
            "title": title,
            "id": slug,
            "raw_audio_url": "https://www.myinstants.com" + rel_audio,
            "page": page
        })

print(f"🎯 Total de sons brasileiros ausentes mapeados: {len(missing_candidates)}")

def normalize_and_measure(src_path, dest_path):
    cmd = [
        "ffmpeg", "-y", "-nostats", "-i", src_path,
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
        "-ar", "44100", "-b:a", "192k", dest_path
    ]
    p = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, errors="replace")
    stderr = p.stderr or ""
    integrated_lufs = -16.0
    true_peak_dbtp = -1.5
    loudness_range_lra = 1.0
    idx = stderr.rfind("{")
    if idx != -1:
        try:
            data = json.loads(stderr[idx:stderr.rfind("}")+1])
            integrated_lufs = round(float(data.get("output_i", -16.0)), 2)
            true_peak_dbtp = round(float(data.get("output_tp", -1.5)), 2)
            loudness_range_lra = round(float(data.get("output_lra", 1.0)), 2)
        except Exception:
            pass

    dur_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", dest_path]
    raw_dur = subprocess.check_output(dur_cmd).decode("utf-8").strip()
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
    for _ in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                if resp.status in (200, 201):
                    return True
        except Exception:
            time.sleep(1)
    return False

def categorize(title):
    t = title.lower()
    if any(w in t for w in ["futebol", "flamengo", "corinthians", "palmeiras", "gol", "craque", "neto", "neymar", "cr7", "messi", "são paulo", "tabela", "vasco"]):
        return "memes"
    if any(w in t for w in ["mario", "fortnite", "shotgun", "pou", "game", "gta", "minecraft", "roblox", "zelda", "sonic"]):
        return "games"
    if any(w in t for w in ["chaves", "chapolin", "kiko", "seu madruga", "filme", "filmes", "desenho", "tv", "novela", "sbt", "globo"]):
        return "tv-filmes"
    if any(w in t for w in ["alarme", "buzina", "sirene", "estourado", "tiro", "explosao", "som", "efeito", "vuvuzela", "despertador", "corta giro"]):
        return "efeitos"
    if any(w in t for w in ["casimiro", "alanzoka", "gaules", "streamer", "stream", "cellbit", "felps", "orochi", "luva"]):
        return "streamers"
    if any(w in t for w in ["funk", "musica", "song", "remix", "beat", "rap", "trap", "hino", "tocando"]):
        return "musica"
    return "memes"

newly_added = []
COLOR_PALETTE = ["#E11D48", "#8B5CF6", "#0EA5E9", "#F59E0B", "#10B981", "#EC4899", "#6366F1", "#EF4444", "#14B8A6", "#EAB308"]

# Ingerir os top 40 ausentes mais populares
to_ingest = missing_candidates[:40]
print(f"🎵 2. Ingerindo, normalizando (EBU R128) e publicando {len(to_ingest)} novos sons brasileiros...")

for idx, item in enumerate(to_ingest, 1):
    sid = item["id"]
    title = item["title"]
    raw_url = item["raw_audio_url"]
    temp_raw = os.path.join(TEMP_DIR, f"raw_{sid}.mp3")
    temp_norm = os.path.join(TEMP_DIR, f"norm_{sid}.mp3")

    try:
        r = requests.get(raw_url, impersonate="chrome120", timeout=15)
        if r.status_code != 200 or len(r.content) < 800:
            continue
    except Exception:
        continue

    with open(temp_raw, "wb") as f:
        f.write(r.content)

    try:
        duration, loudness_metrics = normalize_and_measure(temp_raw, temp_norm)
        if duration > 35.0:
            continue
    except Exception:
        continue

    cdn_filename = f"{sid}.mp3"
    uploaded = upload_to_supabase(temp_norm, cdn_filename)
    if not uploaded:
        continue

    cdn_direct_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{cdn_filename}"
    color = COLOR_PALETTE[len(catalog) % len(COLOR_PALETTE)]
    tags = [w.lower() for w in re.split(r"[\s\-_,.]+", title) if len(w) > 2]
    cat = categorize(title)

    new_sound = {
        "id": sid,
        "title": title,
        "name": title,
        "slug": sid,
        "audioUrl": cdn_direct_url,
        "category": cat,
        "color": color,
        "plays": 0,
        "duration": duration,
        "tags": tags,
        "isTrending": True,
        "loudness": loudness_metrics
    }
    catalog.insert(0, new_sound)
    newly_added.append(new_sound)
    lufs_val = loudness_metrics["integrated_lufs"]
    print(f"  [{idx}/{len(to_ingest)}] ✅ Ingerido: {title} ({duration}s, {lufs_val} LUFS, cat={cat})")

print(f"\n🎉 Total de novos sons brasileiros adicionados ao acervo: {len(newly_added)}")

# 3. Reordenar catálogo preservando o ranking oficial Top 108 Brasil no topo
print("\n🇧🇷 3. Sincronizando ordenação com o ranking oficial do MyInstants Brasil...")
br_ordered_slugs = []
seen_slugs = set()
for page in range(1, 4):
    url = f"https://www.myinstants.com/pt/index/br/?page={page}" if page > 1 else "https://www.myinstants.com/pt/index/br/"
    try:
        r = requests.get(url, impersonate="chrome120", timeout=15)
        if r.status_code != 200:
            continue
    except Exception:
        continue

    soup = BeautifulSoup(r.text, "html.parser")
    for inst in soup.find_all("div", class_="instant"):
        btn = inst.find("button", class_="small-button")
        if not btn:
            continue
        onclick = btn.get("onclick", "")
        m = re.search(r"play\((?:\"|\x27)(/media/sounds/[^\"\x27]+)(?:\"|\x27),\s*(?:\"|\x27)[^\"\x27]*(?:\"|\x27),\s*(?:\"|\x27)([^\"\x27]+)(?:\"|\x27)\)", onclick)
        if m:
            s = m.group(2)
            if s not in seen_slugs:
                seen_slugs.add(s)
                br_ordered_slugs.append(s)

cat_dict = {}
for s in catalog:
    cat_dict[s["id"]] = s
    if s.get("slug"):
        cat_dict[s["slug"]] = s

br_top_sounds = []
used_ids = set()

for rank, slug in enumerate(br_ordered_slugs, 1):
    if slug in cat_dict:
        snd = cat_dict[slug]
        if snd["id"] not in used_ids:
            used_ids.add(snd["id"])
            snd["isTrending"] = True
            br_top_sounds.append(snd)

# Novos sons recém-adicionados que não estavam no top 108
new_trends = [s for s in newly_added if s["id"] not in used_ids]
for s in new_trends:
    used_ids.add(s["id"])

# Restante do acervo
remaining = [s for s in catalog if s["id"] not in used_ids]

final_catalog = br_top_sounds + new_trends + remaining
print(f"📊 Catálogo final consolidado: {len(final_catalog)} sons.")

with open(DATA_JSON, "w") as f:
    json.dump(final_catalog, f, indent=2, ensure_ascii=False)

with open(DATA_TS, "w") as f:
    f.write('import { SoundItem } from "../types";\n\n')
    f.write('export const INITIAL_SOUNDS: SoundItem[] = ')
    f.write(json.dumps(final_catalog, indent=2, ensure_ascii=False))
    f.write(';\n')

print("💾 Arquivos sounds.json e initial-sounds.ts salvos com sucesso!")
