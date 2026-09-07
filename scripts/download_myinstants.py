#!/usr/bin/env python3
"""
Automated downloader for MyInstants Brazil sounds.
Fetches top PT-BR sounds, downloads .mp3 files into public/sounds/,
and updates initial-sounds.ts automatically.
"""

import os
import re
import sys
import time
import json
from curl_cffi import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.myinstants.com"
SOUNDS_DIR = "/home/leonardo/.openclaw/workspace/memesounds/public/sounds"
DATA_FILE = "/home/leonardo/.openclaw/workspace/memesounds/app/data/initial-sounds.ts"

COLORS = [
    "#E11D48", "#8B5CF6", "#0EA5E9", "#F59E0B", "#10B981",
    "#EC4899", "#6366F1", "#EF4444", "#14B8A6", "#EAB308",
    "#06B6D4", "#84CC16", "#F97316", "#D946EF", "#64748B"
]

def categorize(title: str, tags: list) -> str:
    text = (title + " " + " ".join(tags)).lower()
    if any(w in text for w in ["faro", "ratinho", "faustao", "silvio", "sbt", "globo", "chaves", "tv", "radio", "dança gatinho"]):
        return "tv-radio"
    elif any(w in text for w in ["efeito", "som", "risada", "grito", "trompete", "alarme", "notificacao", "bruh", "estourado", "boom"]):
        return "efeitos"
    elif any(w in text for w in ["receba", "bora", "bill", "calabreso", "casimiro", "caze", "tiktok", "meme", "liso", "pedrinho", "aura"]):
        return "memes-web"
    else:
        return "bordoes"

def download_page(page_num: int, existing_slugs: set):
    url = f"{BASE_URL}/pt/index/br/?page={page_num}"
    print(f"\n🌐 [Página {page_num}] Acessando {url}...")
    
    try:
        res = requests.get(url, impersonate="chrome120", timeout=15)
        if res.status_code != 200:
            print(f"⚠️ Erro ao acessar página {page_num}: status {res.status_code}")
            return []
    except Exception as e:
        print(f"⚠️ Exceção ao acessar página {page_num}: {e}")
        return []

    soup = BeautifulSoup(res.text, "html.parser")
    instants = soup.find_all("div", class_="instant")
    print(f"🔍 Encontrados {len(instants)} sons na página {page_num}.")

    downloaded = []

    for idx, inst in enumerate(instants, 1):
        link = inst.find("a", class_="instant-link")
        btn = inst.find("button", class_="small-button")
        if not link or not btn:
            continue

        title = link.text.strip()
        slug_raw = link.get("href", "").replace("/pt/instant/", "").replace("/en/instant/", "").strip("/")
        slug = re.sub(r'[^a-zA-Z0-9_-]', '', slug_raw) or f"som-{int(time.time()*1000)}"

        if slug in existing_slugs:
            print(f"  [{idx}/{len(instants)}] ⏭️ {title} (já existe, pulando)")
            continue

        onclick = btn.get("onclick", "")
        match = re.search(r"play\('(/media/sounds/[^']+)'", onclick)
        if not match:
            continue

        audio_rel_url = match.group(1)
        audio_full_url = f"{BASE_URL}{audio_rel_url}"

        # Clean filename
        ext = os.path.splitext(audio_rel_url)[1] or ".mp3"
        filename = f"{slug}{ext}"
        local_filepath = os.path.join(SOUNDS_DIR, filename)

        # Download audio file
        try:
            time.sleep(0.15) # Polite delay
            audio_res = requests.get(audio_full_url, impersonate="chrome120", timeout=12)
            if audio_res.status_code == 200 and len(audio_res.content) > 500:
                with open(local_filepath, "wb") as f:
                    f.write(audio_res.content)

                size_kb = len(audio_res.content) / 1024
                print(f"  [{idx}/{len(instants)}] ✅ {title} ({size_kb:.1f} KB)")

                color_idx = hash(title) % len(COLORS)
                tags = [w.lower() for w in re.findall(r'\b\w{3,}\b', title)]

                sound_item = {
                    "id": slug,
                    "title": title,
                    "slug": slug,
                    "audioUrl": f"/sounds/{filename}",
                    "category": categorize(title, tags),
                    "color": COLORS[color_idx],
                    "plays": int(abs(hash(slug)) % 400000 + 10000),
                    "duration": 2.0,
                    "tags": tags[:5]
                }
                downloaded.append(sound_item)
                existing_slugs.add(slug)
            else:
                print(f"  [{idx}/{len(instants)}] ❌ Falha ao baixar áudio {audio_full_url} (status: {audio_res.status_code})")
        except Exception as err:
            print(f"  [{idx}/{len(instants)}] ⚠️ Erro no download de {title}: {err}")

    return downloaded

def main():
    pages_to_crawl = 3 # 3 pages = ~108 sounds
    if len(sys.argv) > 1:
        try:
            pages_to_crawl = int(sys.argv[1])
        except ValueError:
            pass

    print(f"🚀 Iniciando download automatizado do MyInstants Brasil ({pages_to_crawl} páginas)...")
    os.makedirs(SOUNDS_DIR, exist_ok=True)

    all_sounds = []
    existing_slugs = set()

    for p in range(1, pages_to_crawl + 1):
        page_sounds = download_page(p, existing_slugs)
        all_sounds.extend(page_sounds)

    print(f"\n🎉 Total de novos sons baixados: {len(all_sounds)}")

    if not all_sounds:
        print("Nenhum som novo foi baixado.")
        return

    # Generate updated initial-sounds.ts
    print(f"💾 Atualizando arquivo de catálogo em {DATA_FILE}...")
    ts_code = "import { SoundItem } from '../types';\n\nexport const INITIAL_SOUNDS: SoundItem[] = "
    ts_code += json.dumps(all_sounds, indent=2, ensure_ascii=False)
    ts_code += ";\n"

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        f.write(ts_code)

    print(f"✨ Catálogo atualizado com sucesso com {len(all_sounds)} sons!")

if __name__ == "__main__":
    main()
