# FleetOS showcase film

A 2:42 motion-graphics video (1920×1080, 30 fps) rendered entirely from code: an HTML/Three.js timeline (`film.html`, `film.css`, `film.js`) is stepped frame by frame in headless Chrome and encoded with ffmpeg. The narration is Microsoft's neural male voice *Andrew* (via `edge-tts`); music and sound effects are synthesized by `music.py`.

Output: `docs/FleetOS-Showcase.mp4` and captions `docs/FleetOS-Showcase.srt`.

## Re-render

Needs Python 3, Node 20+, ffmpeg, Google Chrome, and the dev stack running for the screenshots.

```powershell
pip install edge-tts numpy
npm i --prefix "$env:TEMP\fleetos-video" playwright-core@1.48.2
$env:PLAYWRIGHT = "$env:TEMP\fleetos-video\node_modules\playwright-core"

python video/voice.py          # voiceover + timeline.json (re-run after editing script.json)
node video/capture.cjs         # real app screenshots (ADMIN_EMAIL / ADMIN_PASSWORD for the admin shots)
python video/music.py          # score + transition effects
node video/render.cjs          # frames → video/build/frames.mp4 (~13 min)
node video/mix.cjs             # voice + ducked music + effects → docs/FleetOS-Showcase.mp4
node video/captions.cjs        # docs/FleetOS-Showcase.srt
```

Preview any moment without rendering: serve the project root and open `video/film.html?t=60` (or `?play`), or render stills with `node video/render.cjs --stills 10,60,120`.

## Editing

- **Words:** `script.json`, then `voice.py`. Visual cues follow the new sentence timings automatically.
- **Your name / role on the last screen:** `#who-name`, `#who-role` and `#who-initials` in `film.html`.
- **Timing cues:** `data-at="scene:2+0.3"` (sentence 2 of that scene, plus 0.3 s), `scene@1.5` (seconds into the scene), `scene%0.4` (40 % through its narration).
