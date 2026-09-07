#!/usr/bin/env python3
"""
Comprehensive, high-performance scraper for MyInstants.
Crawls all pages of Brazil, Trending, Memes, TV and Games.
Downloads MP3s with concurrency, resumes automatically,
and updates the catalog in real-time.
"""

import os
import re
import sys
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from curl_cffi import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.myinstants.com"
SOUNDS_DIR = "/home/leonardo/.openclaw/workspace/memesounds/public/sounds"
DATA_TS_FILE = "/home/leonardo/.openclaw/workspace/memesounds/app/data/initial-sounds.ts"
DATA_JSON_FILE = "/home/leonardo/.openclaw/workspace/memesounds/app/data/sounds.json"

COLORS = [
    "#E11D48", "#8B5CF6", "#0EA5E9", "#F59E0B", "#10B981",
    "#EC4899", "#6366F1", "#EF4444", "#14B8A6", "#EAB308",
    "#06B6D4", "#84CC16", "#F97316", "#D946EF", "#64748B"
]

def categorize(title: str, tags: list, source_cat: str = "") -> str:
    if source_cat == "television":
        return "tv-radio"
    elif source_cat == "games" or source_cat == "memes":
        return "memes-web"

    text = (title + " " + " ".join(tags)).lower()
    if any(w in text for w in ["faro", "ratinho", "faustao", "silvio", "sbt", "globo", "chaves", "tv", "radio", "gatinho", "xaropinho"]):
        return "tv-radio"
    elif any(w in text for w in ["efeito", "som", "risada", "grito", "trompete", "alarme", "notificacao", "bruh", "estourado", "boom", "siren"]):
        return "efeitos"
    elif any(w in text for w in ["receba", "bora", "bill", "calabreso", "casimiro", "caze", "tiktok", "meme", "liso", "pedrinho", "aura", "sigma"]):
        return "memes-web"
    else:
        return "bordoes"

def download_sound(session, item):
    slug = item["slug"]
    audio_full_url = item["audio_full_url"]
    filename = f"{slug}.mp3"
    filepath = os.path.join(SOUNDS_DIR, filename)

    # If already downloaded and valid, return quickly
    if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
        return item, True

    try:
        res = session.get(audio_full_url, impersonate="chrome120", timeout=12)
        if res.status_code == 200 and len(res.content) > 500:
            with open(filepath, "wb") as f:
                f.write(res.content)
            return item, True
        else:
            return item, False
    except Exception:
        return item, False

def crawl_page(session, url, source_cat=""):
    try:
        res = session.get(url, impersonate="chrome120", timeout=15)
        if res.status_code != 200:
            return []
    except Exception:
        return []

    soup = BeautifulSoup(res.text, "html.parser")
    instants = soup.find_all("div", class_="instant")

    extracted = []
    for inst in instants:
        link = inst.find("a", class_="instant-link")
        btn = inst.find("button", class_="small-button")
        if not link or not btn:
            continue

        title = link.text.strip()
        slug_raw = link.get("href", "").replace("/pt/instant/", "").replace("/en/instant/", "").strip("/")
        slug = re.sub(r'[^a-zA-Z0-9_-]', '', slug_raw) or f"som-{int(time.time()*1000)}"

        onclick = btn.get("onclick", "")
        match = re.search(r"play\('(/media/sounds/[^']+)'", onclick)
        if not match:
            continue

        audio_rel = match.group(1)
        audio_full = f"{BASE_URL}{audio_rel}"

        tags = [w.lower() for w in re.findall(r'\b\w{3,}\b', title)]
        color_idx = abs(hash(title)) % len(COLORS)

        extracted.append({
            "id": slug,
            "title": title,
            "slug": slug,
            "audioUrl": f"/sounds/{slug}.mp3",
            "audio_full_url": audio_full,
            "category": categorize(title, tags, source_cat),
            "color": COLORS[color_idx],
            "plays": int(abs(hash(slug)) % 450000 + 5000),
            "duration": 2.0,
            "tags": tags[:5]
        })

    return extracted

def save_catalog(catalog_items):
    # Save JSON
    with open(DATA_JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(catalog_items, f, ensure_ascii=False, indent=2)

    # Save TS
    ts_code = "import { SoundItem } from '../types';\n\nexport const INITIAL_SOUNDS: SoundItem[] = "
    ts_code += json.dumps(catalog_items, indent=2, ensure_ascii=False)
    ts_code += ";\n"

    with open(DATA_TS_FILE, "w", encoding="utf-8") as f:
        f.write(ts_code)

def main():
    max_pages_br = 50 # All 50 pages of Brazil (1.800 sounds)
    if len(sys.argv) > 1:
        try:
            max_pages_br = int(sys.argv[1])
        except ValueError:
            pass

    print(f"🚀 INICIANDO RASPAGEM COMPLETA DO MYINSTANTS")
    print(f"📁 Destino dos arquivos: {SOUNDS_DIR}")
    print(f"📊 Alvo: {max_pages_br} páginas do Brasil (até ~{max_pages_br * 36} sons)\n")

    os.makedirs(SOUNDS_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(DATA_TS_FILE), exist_ok=True)

    session = requests.Session()

    # Load existing catalog if available
    catalog = {}
    if os.path.exists(DATA_JSON_FILE):
        try:
            with open(DATA_JSON_FILE, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    catalog[item["id"]] = item
            print(f"📦 Catálogo pré-existente carregado com {len(catalog)} sons.")
        except Exception:
            pass

    # Check local files already downloaded
    existing_files = set(os.listdir(SOUNDS_DIR))
    print(f"💾 Arquivos locais já presentes em public/sounds/: {len(existing_files)}\n")

    total_downloaded = 0
    total_skipped = 0

    # 1. Crawl all Brazil Pages
    print("🇧🇷 [1/2] Rastreando catálogo Brasil (/pt/index/br/)...")
    for page in range(1, max_pages_br + 1):
        page_url = f"{BASE_URL}/pt/index/br/?page={page}"
        items = crawl_page(session, page_url)
        if not items:
            print(f"  🏁 Fim das páginas alcançado na página {page}.")
            break

        print(f"  📄 Página {page:02d}/{max_pages_br}: {len(items)} sons encontrados. Baixando áudios...")

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(download_sound, session, item): item for item in items}
            for fut in as_completed(futures):
                item, success = fut.result()
                if success:
                    if f"{item['slug']}.mp3" in existing_files:
                        total_skipped += 1
                    else:
                        total_downloaded += 1
                        existing_files.add(f"{item['slug']}.mp3")

                    # Remove internal field before catalog save
                    clean_item = {k: v for k, v in item.items() if k != "audio_full_url"}
                    catalog[clean_item["id"]] = clean_item

        # Save progress every 5 pages
        if page % 5 == 0 or page == max_pages_br:
            save_catalog(list(catalog.values()))
            print(f"    💾 Progresso salvo! Total atual no catálogo: {len(catalog)} sons.")

    # 2. Crawl Trending & Categories
    additional_sections = [
        ("trending", f"{BASE_URL}/pt/trending/?page=", 10),
        ("memes", f"{BASE_URL}/pt/categories/memes/?page=", 10),
        ("television", f"{BASE_URL}/pt/categories/television/?page=", 10),
        ("games", f"{BASE_URL}/pt/categories/games/?page=", 10),
    ]

    print("\n🔥 [2/2] Rastreando Em Alta, Memes, TV e Games...")
    for sec_name, sec_url, num_pages in additional_sections:
        print(f"  📂 Categoria: {sec_name.upper()} ({num_pages} páginas)...")
        for p in range(1, num_pages + 1):
            items = crawl_page(session, f"{sec_url}{p}", source_cat=sec_name)
            if not items:
                break

            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = {executor.submit(download_sound, session, item): item for item in items}
                for fut in as_completed(futures):
                    item, success = fut.result()
                    if success:
                        clean_item = {k: v for k, v in item.items() if k != "audio_full_url"}
                        catalog[clean_item["id"]] = clean_item

    # Final save
    final_list = list(catalog.values())
    save_catalog(final_list)

    print("\n" + "="*60)
    print(f"🎉 RASPAGEM CONCLUÍDA COM SUCESSO!")
    print(f"📊 Total final de sons catalogados: {len(final_list)}")
    print(f"📁 Arquivos salvos em: {SOUNDS_DIR}")
    print(f"📄 Catálogo gerado em: {DATA_TS_FILE}")
    print("="*60)

if __name__ == "__main__":
    main()
