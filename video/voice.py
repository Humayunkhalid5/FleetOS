"""Generate the male voiceover for each scene and a timeline with sentence timings.

    pip install edge-tts
    python video/voice.py

Writes video/build/voice/<scene>.mp3 and video/build/timeline.json.
"""
import asyncio
import json
import pathlib
import subprocess

import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'build'
VOICE_DIR = OUT / 'voice'
VOICE_DIR.mkdir(parents=True, exist_ok=True)

script = json.loads((ROOT / 'script.json').read_text(encoding='utf-8'))


def duration(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True, check=True)
    return float(result.stdout.strip())


async def synth(scene):
    target = VOICE_DIR / f"{scene['id']}.mp3"
    communicate = edge_tts.Communicate(scene['narration'], script['voice'], rate=script.get('rate', '+0%'), boundary='SentenceBoundary')
    sentences = []
    with open(target, 'wb') as handle:
        async for chunk in communicate.stream():
            if chunk['type'] == 'audio':
                handle.write(chunk['data'])
            elif chunk['type'] == 'SentenceBoundary':
                # Offsets are in 100-nanosecond units.
                sentences.append({'text': chunk['text'], 'start': chunk['offset'] / 1e7, 'end': (chunk['offset'] + chunk['duration']) / 1e7})
    return target, sentences


async def main():
    timeline = []
    cursor = 0.6  # short lead-in before the first word
    for scene in script['scenes']:
        path, sentences = await synth(scene)
        length = duration(path)
        timeline.append({
            'id': scene['id'],
            'audio': f"voice/{scene['id']}.mp3",
            'voiceStart': round(cursor, 3),
            'voiceLength': round(length, 3),
            'start': round(cursor - (0.6 if not timeline else script['gapAfter'] / 2), 3),
            'sentences': [{'text': s['text'], 'start': round(cursor + s['start'], 3), 'end': round(cursor + s['end'], 3)} for s in sentences],
        })
        cursor += length + script['gapAfter']
        print(f"{scene['id']:<10} {length:6.2f}s  {len(sentences)} sentences")
    for index, scene in enumerate(timeline):
        scene['end'] = timeline[index + 1]['start'] if index + 1 < len(timeline) else round(cursor + 3.2, 3)
    total = timeline[-1]['end']
    (OUT / 'timeline.json').write_text(json.dumps({'fps': 30, 'width': 1920, 'height': 1080, 'duration': total, 'scenes': timeline}, indent=2), encoding='utf-8')
    print(f'total {total:.2f}s')


asyncio.run(main())
