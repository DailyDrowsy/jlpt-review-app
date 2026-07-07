import argparse
import asyncio
import json
import re
from pathlib import Path

import edge_tts


ROOT = Path(__file__).resolve().parents[1]
VOCAB_JS = ROOT / "assets" / "vocab-data.js"
AUDIO_ROOT = ROOT / "assets" / "audio"
WORDS_DIR = AUDIO_ROOT / "words"
MANIFEST = AUDIO_ROOT / "manifest.json"
DEFAULT_VOICE = "ja-JP-NanamiNeural"


def load_vocab():
    text = VOCAB_JS.read_text(encoding="utf-8")
    prefix = "window.DEFAULT_VOCAB = "
    if not text.startswith(prefix):
        raise RuntimeError(f"Unexpected vocab format: {VOCAB_JS}")
    payload = text[len(prefix) :].strip()
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)


def clean_kana(value):
    text = str(value or "").strip()
    text = re.sub(r"[（(][^）)]*[）)]", "", text)
    text = re.sub(r"\s+", "", text)
    return text.strip("、，;；/／")


def speech_text(item):
    return clean_kana(item.get("kana")) or str(item.get("word") or "").strip()


async def render_one(item, voice, force):
    word_id = str(item.get("id") or "").strip()
    text = speech_text(item)
    if not word_id or not text:
        return None
    target = WORDS_DIR / f"{word_id}.mp3"
    if target.exists() and target.stat().st_size > 0 and not force:
        return word_id
    communicate = edge_tts.Communicate(text=text, voice=voice)
    await communicate.save(str(target))
    return word_id


async def render_all(items, voice, concurrency, force):
    WORDS_DIR.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(concurrency)
    done = []

    async def run(item, index):
        async with semaphore:
            word_id = await render_one(item, voice, force)
            if word_id:
                done.append(word_id)
            if (index + 1) % 50 == 0:
                print(f"{index + 1}/{len(items)}")

    await asyncio.gather(*(run(item, index) for index, item in enumerate(items)))
    return sorted(done)


def write_manifest(word_ids, voice):
    AUDIO_ROOT.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 1,
        "kind": "word",
        "voice": voice,
        "words": word_ids,
    }
    MANIFEST.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", default=DEFAULT_VOICE)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    items = load_vocab()
    if args.limit:
        items = items[: args.limit]
    word_ids = await render_all(items, args.voice, args.concurrency, args.force)
    write_manifest(word_ids, args.voice)
    print(f"Wrote {len(word_ids)} audio files to {WORDS_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
