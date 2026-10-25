"""Synthesize the background score and transition effects for the film.

    pip install numpy
    python video/music.py        → video/build/music.wav, video/build/sfx.wav

Everything is generated here, so there are no licensing questions.
"""
import json
import pathlib
import wave

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent
BUILD = ROOT / 'build'
timeline = json.loads((BUILD / 'timeline.json').read_text(encoding='utf-8'))
SR = 44100
DURATION = timeline['duration'] + 0.5
N = int(DURATION * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)


def note(name):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + 12 * (octave + 1) - 69) / 12)


def lowpass(signal, cutoff):
    # Smooth 4th-order-style low-pass applied in the frequency domain.
    spectrum = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(len(signal), 1 / SR)
    spectrum *= 1 / (1 + (freqs / cutoff) ** 4)
    return np.fft.irfft(spectrum, n=len(signal))


def envelope(length, attack, release):
    env = np.ones(length)
    a = min(int(attack * SR), length // 2)
    r = min(int(release * SR), length - a)
    env[:a] = np.linspace(0, 1, a) ** 2 if a else 1
    env[-r:] = np.linspace(1, 0, r) ** 1.5 if r else 1
    return env


# Progression (A minor, uplifting): Am – F – C – G, 4 bars of 2.4 s each (100 BPM, 4/4).
BAR = 2.4
CHORDS = [['A2', 'E3', 'A3', 'C4', 'E4'], ['F2', 'C3', 'F3', 'A3', 'C4'], ['C3', 'G3', 'C4', 'E4', 'G4'], ['G2', 'D3', 'G3', 'B3', 'D4']]
pad_l = np.zeros(N)
pad_r = np.zeros(N)
arp = np.zeros(N)
bass = np.zeros(N)
chord_len = int(BAR * SR)
position = 0
index = 0
while position < N:
    chord = CHORDS[index % 4]
    length = min(chord_len + int(0.6 * SR), N - position)
    seg_t = np.arange(length) / SR
    env = envelope(length, 0.9, 1.2)
    for k, name in enumerate(chord):
        f = note(name)
        for detune, side in ((0.997, 'l'), (1.003, 'r')):
            wave_ = np.sin(2 * np.pi * f * detune * seg_t) + 0.35 * np.sin(2 * np.pi * 2 * f * detune * seg_t) + 0.12 * np.sin(2 * np.pi * 3 * f * detune * seg_t)
            target = pad_l if side == 'l' else pad_r
            target[position:position + length] += wave_ * env * (0.16 if k else 0.22)
    root = note(chord[0]) / 2
    bass[position:position + length] += np.sin(2 * np.pi * root * seg_t) * envelope(length, 0.05, 0.8) * 0.5
    # Arpeggio: eighth notes cycling through the chord an octave up.
    step = int(BAR / 8 * SR)
    for k in range(8):
        start = position + k * step
        if start >= N:
            break
        f = note(chord[[1, 2, 3, 4, 3, 2, 3, 4][k]]) * 2
        length_n = min(int(0.42 * SR), N - start)
        nt = np.arange(length_n) / SR
        pluck = (np.sin(2 * np.pi * f * nt) + 0.3 * np.sin(2 * np.pi * 2 * f * nt)) * np.exp(-nt * 7.5)
        arp[start:start + length_n] += pluck * 0.22
    position += chord_len
    index += 1

# Arrangement: soft intro (problem), full energy from the solution reveal.
scenes = {scene['id']: scene for scene in timeline['scenes']}
reveal = scenes['solution']['start']
arp_gain = np.clip((t - (reveal - 1.5)) / 3.0, 0, 1) * 0.9 + 0.1 * np.clip(t / 6, 0, 1)
arp_gain *= np.where(t > scenes['cta']['start'] + 6, np.clip(1 - (t - scenes['cta']['start'] - 6) / 4, 0, 1), 1)
pad_gain = np.clip(t / 4, 0, 1) * np.clip((DURATION - t) / 3.5, 0, 1)
bass_gain = np.clip((t - reveal + 0.5) / 2, 0, 1) * np.clip((DURATION - t) / 3, 0, 1)

pad_l = lowpass(pad_l, 1400)
pad_r = lowpass(pad_r, 1400)
left = pad_l * pad_gain + bass * bass_gain * 0.8 + arp * arp_gain * 0.85
right = pad_r * pad_gain + bass * bass_gain * 0.8 + arp * arp_gain * 1.0

# Simple stereo echo on the arpeggio for space.
delay = int(0.3 * SR)
echo = np.zeros(N)
echo[delay:] = arp[:-delay] * arp_gain[:-delay] * 0.35
left += echo * 0.7
right[delay // 2:] += echo[:-delay // 2] * 0.5

# Transition effects: a filtered-noise whoosh into each scene and a sub boom at the reveal.
sfx = np.zeros(N)
for scene in timeline['scenes'][1:]:
    center = int(scene['start'] * SR)
    length = int(0.9 * SR)
    start = max(0, center - int(0.6 * SR))
    end = min(N, start + length)
    noise = rng.standard_normal(end - start)
    shape = np.sin(np.linspace(0, np.pi, end - start)) ** 2
    sweep = lowpass(noise, 2500) * shape
    sfx[start:end] += sweep * 0.35
for moment, strength in ((reveal + 0.05, 1.0), (scenes['cta']['start'] + 0.1, 0.8)):
    start = int(moment * SR)
    length = min(int(2.2 * SR), N - start)
    bt = np.arange(length) / SR
    sfx[start:start + length] += np.sin(2 * np.pi * (55 - 20 * bt) * bt) * np.exp(-bt * 2.2) * 0.9 * strength


def write(path, channels):
    data = np.stack(channels, axis=1) if len(channels) > 1 else channels[0][:, None]
    peak = np.max(np.abs(data)) or 1
    data = np.int16(data / peak * 0.89 * 32767)
    with wave.open(str(path), 'wb') as handle:
        handle.setnchannels(data.shape[1])
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(data.tobytes())


write(BUILD / 'music.wav', [left, right])
write(BUILD / 'sfx.wav', [sfx])
print('music', round(DURATION, 1), 's')
