#!/usr/bin/env python3
"""
Sync all downloaded sound files to Supabase Storage.
Uploads MP3s to bucket 'sounds' with multi-threading.
Updates initial-sounds.ts to use Supabase Storage CDN URLs.
"""

import os
import sys
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import urllib.error

SUPABASE_URL = "https://bfwdlanqfokvmxhzfdie.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmd2RsYW5xZm9rdm14aHpmZGllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc5Mzg1NywiZXhwIjoyMTA0MzY5ODU3fQ.n6b0zpr1zb67a-nn9SHtk88aPtx0JKcvZlh9CJjdz34"
BUCKET = "sounds"
SOUNDS_DIR = "/home/leonardo/.openclaw/workspace/memesounds/public/sounds"
DATA_TS = "/home/leonardo/.openclaw/workspace/memesounds/app/data/initial-sounds.ts"
DATA_JSON = "/home/leonardo/.openclaw/workspace/memesounds/app/data/sounds.json"

STORAGE_PUBLIC_BASE = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}"

def upload_file(filename):
    filepath = os.path.join(SOUNDS_DIR, filename)
    if not os.path.isfile(filepath):
        return filename, False, "Not a file"

    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{filename}"
    
    with open(filepath, "rb") as f:
        file_bytes = f.read()

    req = urllib.request.Request(
        url,
        data=file_bytes,
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
                    return filename, True, len(file_bytes)
                else:
                    return filename, False, f"Status: {resp.status}"
        except urllib.error.HTTPError as he:
            if attempt == 2:
                return filename, False, f"HTTPError {he.code}"
            time.sleep(0.5)
        except Exception as e:
            if attempt == 2:
                return filename, False, str(e)
            time.sleep(0.5)

    return filename, False, "Max retries reached"

def main():
    if not os.path.exists(SOUNDS_DIR):
        print(f"❌ Diretório não encontrado: {SOUNDS_DIR}")
        return

    files = [f for f in os.listdir(SOUNDS_DIR) if f.endswith(".mp3")]
    total_files = len(files)
    print(f"🚀 Iniciando upload de {total_files} arquivos para o Supabase Storage ({BUCKET})...")
    print(f"🌐 Destino: {STORAGE_PUBLIC_BASE}/<arquivo>\n")

    start_time = time.time()
    uploaded_count = 0
    failed_count = 0
    total_bytes = 0

    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = {executor.submit(upload_file, f): f for f in files}
        
        for i, fut in enumerate(as_completed(futures), 1):
            fname, success, info = fut.result()
            if success:
                uploaded_count += 1
                total_bytes += info
            else:
                failed_count += 1

            if i % 100 == 0 or i == total_files:
                elapsed = time.time() - start_time
                mb = total_bytes / (1024 * 1024)
                rate = mb / elapsed if elapsed > 0 else 0
                print(f"  [{i:4d}/{total_files}] ✅ {uploaded_count} enviados ({mb:.1f} MB | {rate:.2f} MB/s)")

    elapsed = time.time() - start_time
    print(f"\n🎉 Sincronização concluída em {elapsed:.1f} segundos!")
    print(f"✅ Total enviados com sucesso: {uploaded_count}/{total_files}")
    if failed_count > 0:
        print(f"⚠️ Falhas: {failed_count}")

    # Update initial-sounds.ts to use Supabase Storage CDN URLs
    if os.path.exists(DATA_JSON):
        print(f"\n💾 Atualizando catálogo de sons com as URLs do Supabase...")
        with open(DATA_JSON, "r", encoding="utf-8") as f:
            items = json.load(f)

        for item in items:
            slug = item["slug"]
            item["audioUrl"] = f"{STORAGE_PUBLIC_BASE}/{slug}.mp3"

        with open(DATA_JSON, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)

        ts_code = "import { SoundItem } from '../types';\n\nexport const INITIAL_SOUNDS: SoundItem[] = "
        ts_code += json.dumps(items, indent=2, ensure_ascii=False)
        ts_code += ";\n"

        with open(DATA_TS, "w", encoding="utf-8") as f:
            f.write(ts_code)

        print(f"✨ Catálogo {DATA_TS} atualizado com as URLs públicas do Supabase Storage!")

if __name__ == "__main__":
    main()
