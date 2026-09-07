#!/usr/bin/env python3
"""
Reset plays to 0, mark trending sounds, and reorganize categories
combining the best of MyInstants and 101Soundboards.
"""

import json
import re

DATA_JSON = "/home/leonardo/.openclaw/workspace/memesounds/app/data/sounds.json"
DATA_TS = "/home/leonardo/.openclaw/workspace/memesounds/app/data/initial-sounds.ts"

# Unified Categories:
# 'memes' | 'games' | 'tv-filmes' | 'efeitos' | 'streamers' | 'musica' | 'bordoes'

def detect_category(title: str, tags: list, old_cat: str) -> str:
    text = (title + " " + " ".join(tags)).lower()

    # Games
    game_keywords = [
        "roblox", "minecraft", "free fire", "gta", "mario", "zelda", "fortnite",
        "among us", "sonic", "undertale", "clash", "csgo", "counter strike",
        "pokemon", "fnaf", "elden ring", "god of war", "gamer", "jogo do botao",
        "game", "rdr", "street fighter", "hadouken", "fall guys", "league of legends"
    ]
    if any(k in text for k in game_keywords):
        return "games"

    # Streamers & Celebridades da Internet
    streamer_keywords = [
        "casimiro", "caze", "luva de pedreiro", "receba", "alanzoka", "gaules",
        "cellbit", "monark", "flow", "podpah", "streamer", "twitch", "felca",
        "orochinho", "smzinho", "manoel gomes", "caneta azul", "toninho tornado",
        "calabreso", "carlinhos", "speed", "ishowspeed"
    ]
    if any(k in text for k in streamer_keywords):
        return "streamers"

    # TV & Filmes
    tv_keywords = [
        "faro", "faustao", "ratinho", "silvio santos", "chaves", "kiko", "globo",
        "sbt", "datena", "didi", "filme", "novela", "pica pau", "shrek", "star wars",
        "vingadores", "cinema", "tv", "jornal nacional", "plantao da globo", "galvao bueno",
        "xaropinho", "vovo juju", "irmao do jorel", "dexter", "dragon ball", "naruto"
    ]
    if any(k in text for k in tv_keywords):
        return "tv-filmes"

    # Efeitos Sonoros (SFX / Foley)
    sfx_keywords = [
        "trompete", "risada", "grito", "alarme", "boom", "buzina", "aplausos",
        "fart", "som", "effect", "sfx", "vine boom", "laser", "campainha", "soco",
        "tiro", "estourado", "bass boosted", "notificacao", "erro", "windows",
        "scream", "punch", "peido", "tiro", "explosao"
    ]
    if any(k in text for k in sfx_keywords):
        return "efeitos"

    # Música & Vinhetas
    music_keywords = [
        "vinheta", "musica", "song", "funk", "forro", "piano", "flauta",
        "beat", "remix", "intro", "tema", "abertura", "sax", "guitarra"
    ]
    if any(k in text for k in music_keywords):
        return "musica"

    # Bordões Curtos
    bordao_keywords = [
        "chega", "para ne", "nao e mole nao", "calma", "ui", "eita", "rapaz",
        "uepa", "tome", "vish", "caraca", "demais", "errou", "oloco", "bora bill",
        "bom dia", "vai dar namoro"
    ]
    if any(k in text for k in bordao_keywords):
        return "bordoes"

    return "memes"

def main():
    with open(DATA_JSON, "r", encoding="utf-8") as f:
        sounds = json.load(f)

    print(f"Carregando {len(sounds)} sons...")

    category_counts = {}
    trending_count = 0

    for idx, sound in enumerate(sounds):
        # 1. Zerar plays
        sound["plays"] = 0

        # 2. Marcar "Em Alta" (os primeiros 120 sons vindos das primeiras páginas dos rankings)
        if idx < 120:
            sound["isTrending"] = True
            trending_count += 1
        else:
            sound["isTrending"] = False

        # 3. Categorização aprimorada
        new_cat = detect_category(sound["title"], sound.get("tags", []), sound.get("category", ""))
        sound["category"] = new_cat
        category_counts[new_cat] = category_counts.get(new_cat, 0) + 1

    print("\n📊 Distribuição das Novas Categorias:")
    for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
        print(f"  - {cat.upper()}: {count} sons")
    print(f"  - EM ALTA (TRENDING): {trending_count} sons")
    print(f"  - PLAYS: todos zerados para 0!")

    # Salvar JSON
    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(sounds, f, ensure_ascii=False, indent=2)

    # Salvar TS
    ts_code = "import { SoundItem } from '../types';\n\nexport const INITIAL_SOUNDS: SoundItem[] = "
    ts_code += json.dumps(sounds, indent=2, ensure_ascii=False)
    ts_code += ";\n"

    with open(DATA_TS, "w", encoding="utf-8") as f:
        f.write(ts_code)

    print(f"\n✅ Arquivos {DATA_JSON} e {DATA_TS} atualizados!")

if __name__ == "__main__":
    main()
