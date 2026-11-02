#!/usr/bin/env python3
"""Synthesise the promo film score from the cue sheet exported by stage.html.

render.py writes window.CUES to cues.json; this script turns it into a 100 BPM score.
Everything is generated with numpy/scipy, no samples: pad, plucked arpeggio, bass, kick,
hats, key clicks for typed questions, UI chimes, risers, impacts and bells, with a shared
convolution reverb.
  python3 score.py cues.json OUT.wav
"""

import json
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve, lfilter

CUES = json.load(open(sys.argv[1]))
SR = 48000
DUR = CUES["duration"]
BEAT = 60 / CUES["bpm"]
BAR = 4 * BEAT
N = int(SR * DUR)
rng = np.random.default_rng(7)
END = CUES["end"]

PROG = [([50, 53, 57, 60, 64], 38), ([46, 50, 53, 57, 60], 34), ([53, 57, 60, 64, 67], 41), ([48, 52, 55, 57, 62], 36)]  # Dm9 Bbmaj9 Fmaj9 C6/9
FINAL = ([50, 54, 57, 61, 64, 69], 38)  # Dmaj9 on the end card


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def chord_at(t):
    return FINAL if t >= END - 1e-6 else PROG[int(t // BAR) % 4]


def buf():
    return np.zeros((2, N))


def place(dst, sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N:
        return
    lr = sig if sig.ndim == 2 else np.array([np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)])[:, None] * sig[None, :]
    n = min(lr.shape[1], N - i)
    dst[:, i:i + n] += gain * lr[:, :n]


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    return lfilter([1 - a], [1, -a], x)


def section(t):
    """Energy of the arrangement at time t: intro, build, groove, light groove, breakdown, end."""
    if t < CUES["send"]:
        return "intro"
    if t < CUES["result"]:
        return "build"
    if t < CUES["pullBack"]:
        return "groove"
    if t < CUES["cases"][0]:
        return "bridge"
    if t < CUES["open"]:
        return "groove"
    if t < END:
        return "breakdown"
    return "end"


pad, arp, bass, drums, fx = buf(), buf(), buf(), buf(), buf()

# pad: one segment per bar, the final chord holds from the end card
bars = [(b * BAR, min((b + 1) * BAR, END)) for b in range(int(np.ceil(END / BAR)))] + [(END, DUR)]
for a, b in bars:
    if b <= a:
        continue
    notes, _ = chord_at(a)
    n = int(SR * (b - a + 1.6))
    t = np.arange(n) / SR
    e = np.minimum(1, t / (1.8 if a == 0 else 0.45)) * np.clip(1 - (t - (b - a)) / 1.4, 0, 1)
    for k, m in enumerate(notes):
        for det, pan in ((-0.07, -0.6), (0.0, 0.0), (0.07, 0.6)):
            f = midi(m + det)
            v = sum(np.sin(2 * np.pi * f * h * t + k + h) / h * np.exp(-h / 3.2) for h in range(1, 7))
            place(pad, v * e, a, 0.03, pan)

# plucked arpeggio
pattern = [0, 2, 4, 1, 3, 2, 4, 3]
for step in range(int(DUR / (BEAT / 4))):
    t0 = step * BEAT / 4
    sec = section(t0)
    if sec == "intro" or t0 >= DUR - 1.6:
        continue
    if sec in ("build", "bridge", "breakdown", "end") and step % 2:
        continue
    notes, _ = chord_at(t0)
    m = notes[pattern[step % 8] % len(notes)] + 12 + (12 if step % 16 >= 12 else 0)
    t = np.arange(int(SR * 0.5)) / SR
    v = (np.sin(2 * np.pi * midi(m) * t) + 0.4 * np.sin(4 * np.pi * midi(m) * t) * np.exp(-t / 0.05)) * np.exp(-t / 0.14) * np.minimum(1, t / 0.003)
    place(arp, v, t0, 0.05 if sec in ("breakdown", "end", "bridge") else 0.065, pan=0.45 if step % 2 else -0.45)

# bass, kick and hats in the groove sections
kicks = []
for step in range(int(DUR / (BEAT / 2))):
    t0 = step * BEAT / 2
    if section(t0) != "groove":
        continue
    _, root = chord_at(t0)
    f = midi(root + (12 if step % 4 == 3 else 0))
    t = np.arange(int(SR * 0.32)) / SR
    v = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 6)) * np.exp(-t / 0.16) * np.minimum(1, t / 0.004)
    place(bass, lowpass(v, 900), t0, 0.15)
    if step % 2 == 0:
        kicks.append(t0)
    elif t0 >= CUES["cases"][0]:
        noise = np.diff(rng.standard_normal(int(SR * 0.08) + 1))
        place(drums, noise * np.exp(-np.arange(len(noise)) / SR / 0.025), t0, 0.045, pan=0.25)
for t0 in kicks:
    t = np.arange(int(SR * 0.45)) / SR
    place(drums, np.sin(2 * np.pi * np.cumsum(44 + 110 * np.exp(-t / 0.035)) / SR) * np.exp(-t / 0.26), t0, 0.5)
duck = np.ones(N)
for t0 in kicks:
    i = int(t0 * SR); n = min(int(SR * 0.4), N - i)
    duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.45 * np.exp(-np.arange(n) / SR / 0.11))
for b in (pad, arp, bass):
    b *= duck

# key clicks for every typed character
for i, t0 in enumerate(CUES["typed"]):
    n = int(SR * 0.04)
    t = np.arange(n) / SR
    click = np.diff(rng.standard_normal(n + 1)) * np.exp(-t / 0.006) + 0.4 * np.sin(2 * np.pi * (1800 + 300 * (i % 3)) * t) * np.exp(-t / 0.01)
    place(fx, click, t0, 0.04, pan=(i % 5 - 2) * 0.08)


def bell(t0, m, gain=1.0, pan=0.0):
    t = np.arange(int(SR * 2.4)) / SR
    f = midi(m)
    v = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for r, a, d in ((1, 1, 1.6), (2.76, .5, .9), (5.4, .25, .5), (8.93, .12, .3)))
    place(fx, v * np.minimum(1, t / 0.002), t0, 0.07 * gain, pan)


def swell(t_ref, length, gain=1.0, up=True):
    n = int(SR * length)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    shape = (t / length) ** 2.2 if up else np.exp(-t / (length / 3))
    a = np.exp(-2 * np.pi * 300 * (1 + 40 * shape) / SR)
    out, y = np.zeros(n), 0.0
    for i in range(n):
        y = (1 - a[i]) * noise[i] + a[i] * y
        out[i] = y
    v = out * 1.6 * shape
    place(fx, np.vstack([v, np.roll(v, 240)]), t_ref - length if up else t_ref, 0.2 * gain)


def impact(t0, gain=1.0):
    t = np.arange(int(SR * 2.2)) / SR
    boom = np.sin(2 * np.pi * np.cumsum(30 + 34 * np.exp(-t / 0.25)) / SR) * np.exp(-t / 0.75)
    hit = lowpass(rng.standard_normal(len(t)), 2400) * np.exp(-t / 0.18)
    place(fx, boom, t0, 0.65 * gain)
    place(fx, np.vstack([hit, np.roll(hit, 400)]), t0, 0.45 * gain)


swell(CUES["send"] + 0.05, 0.5, 0.5)
for i, t0 in enumerate(CUES["steps"]):
    bell(t0, 88 + 2 * i, 0.55, pan=-0.25 + 0.25 * i)
swell(CUES["result"], 1.2, 0.9); impact(CUES["result"], 0.9); bell(CUES["result"], 81, 0.9)
swell(CUES["pullBack"], 1.4, 0.7, up=False); bell(CUES["bridgeLine"], 84, 0.6)
swell(CUES["cases"][0], 1.2, 0.8); impact(CUES["cases"][0], 0.75)
for i, (t0, hit) in enumerate(zip(CUES["cases"], CUES["caseHits"])):
    if i:
        impact(t0, 0.3)
    bell(hit, (81, 83, 84, 86)[i], 0.8, pan=0.2)
for t0 in (CUES["reach"], CUES["prep"], CUES["entry"]):
    impact(t0, 0.35)
for i, t0 in enumerate(CUES["prepNodes"]):
    bell(t0, 86 + 2 * i, 0.45, pan=-0.3 + 0.3 * i)
swell(CUES["open"], 0.8, 0.4, up=False)
swell(END, 1.6, 0.9); impact(END, 0.8); bell(END + 0.15, 81, 1.2); bell(END + 0.15, 88, 0.7, pan=0.3)

# mix
ir_n = int(SR * 2.8)
ir_t = np.arange(ir_n) / SR
ir = np.vstack([lowpass(rng.standard_normal(ir_n), 5000), lowpass(rng.standard_normal(ir_n), 5000)]) * np.exp(-ir_t / 0.6)
ir /= np.abs(ir).sum(axis=1, keepdims=True) ** 0.5 * 12
send = pad * 0.6 + arp * 0.9 + fx * 0.5
wet = np.vstack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
mixed = pad + arp + bass + drums + fx + wet * 0.9
t = np.arange(N) / SR
mixed *= np.minimum(1, t / 0.3) * np.clip((DUR - t) / 1.4, 0, 1)
mixed = np.tanh(mixed * 1.4) / np.tanh(1.4)
mixed *= 0.89 / np.abs(mixed).max()
wavfile.write(sys.argv[2], SR, mixed.T.astype(np.float32))
print(sys.argv[2])
