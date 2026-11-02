#!/usr/bin/env python3
"""Synthesise the score for the 19.2 s story film (100 BPM, cues taken from stage.html).

Everything is generated with numpy/scipy, no samples: pad, plucked arpeggio, bass, kick,
key clicks for the typed request, UI chimes for completed steps, risers, impacts and bells,
with a shared convolution reverb.
  python3 score.py OUT.wav
"""

import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve, lfilter

SR = 48000
DUR = 19.2
BEAT = 0.6                       # 100 BPM
N = int(SR * DUR)
rng = np.random.default_rng(7)

# cue sheet, mirrored from stage.html
QUESTION = "求这个 Hamiltonian 在汉明权重 1 扇区的基态能量，并用独立方法核对。"
TYPED = [1.35 + 2.6 * (i / (len(QUESTION) - 1)) + 0.03 * np.sin(i * 7.3) for i in range(len(QUESTION))]
SEND, STEP_DONE, RESULT, PULL_BACK, LINES, END = 4.2, (6.4, 8.9, 9.3), 9.6, 12.6, (13.0, 13.45), 15.0
CHORDS = [  # (start, end, pad notes, bass root)
    (0.0, 2.4, [50, 53, 57, 60, 64], 38),     # Dm9
    (2.4, 4.8, [46, 50, 53, 57, 60], 34),     # Bbmaj9
    (4.8, 7.2, [53, 57, 60, 64, 67], 41),     # Fmaj9
    (7.2, 9.6, [48, 52, 55, 57, 62], 36),     # C6/9
    (9.6, 12.0, [50, 53, 57, 60, 64], 38),    # Dm9
    (12.0, 15.0, [46, 50, 53, 57, 60], 34),   # Bbmaj9
    (15.0, DUR, [50, 54, 57, 61, 64, 69], 38),  # Dmaj9 resolves on the end card
]


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


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


def chord_at(t):
    for a, b, notes, root in CHORDS:
        if a <= t < b:
            return notes, root
    return CHORDS[-1][2], CHORDS[-1][3]


pad, arp, bass, drums, fx = buf(), buf(), buf(), buf(), buf()

# pad
for a, b, notes, _ in CHORDS:
    n = int(SR * (b - a + 1.6))
    t = np.arange(n) / SR
    e = np.minimum(1, t / (1.8 if a == 0 else 0.45)) * np.clip(1 - (t - (b - a)) / 1.4, 0, 1)
    for k, m in enumerate(notes):
        for det, pan in ((-0.07, -0.6), (0.0, 0.0), (0.07, 0.6)):
            f = midi(m + det)
            v = sum(np.sin(2 * np.pi * f * h * t + k + h) / h * np.exp(-h / 3.2) for h in range(1, 7))
            place(pad, v * e, a, 0.03 if a < SEND else 0.034, pan)

# plucked arpeggio: 8ths after the request is sent, 16ths from the result
pattern = [0, 2, 4, 1, 3, 2, 4, 3]
for step in range(int(DUR / (BEAT / 4))):
    t0 = step * BEAT / 4
    if t0 < SEND or t0 >= 18.0 or (PULL_BACK <= t0 < END):
        continue
    if t0 < RESULT and step % 2:
        continue
    notes, _ = chord_at(t0)
    m = notes[pattern[step % 8] % len(notes)] + 12 + (12 if step % 16 >= 12 else 0)
    t = np.arange(int(SR * 0.5)) / SR
    bright = 0.3 + 0.7 * min(1, max(0, (t0 - SEND) / 6))
    v = (np.sin(2 * np.pi * midi(m) * t) + 0.4 * bright * np.sin(4 * np.pi * midi(m) * t) * np.exp(-t / 0.05)) * np.exp(-t / 0.14) * np.minimum(1, t / 0.003)
    place(arp, v, t0, 0.06 if t0 < END else 0.045, pan=0.45 if step % 2 else -0.45)

# bass and kick through the result
for step in range(int(DUR / (BEAT / 2))):
    t0 = step * BEAT / 2
    if not (RESULT <= t0 < PULL_BACK):
        continue
    _, root = chord_at(t0)
    f = midi(root + (12 if step % 4 == 3 else 0))
    t = np.arange(int(SR * 0.32)) / SR
    v = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 6)) * np.exp(-t / 0.16) * np.minimum(1, t / 0.004)
    place(bass, lowpass(v, 900), t0, 0.16)
kicks = [RESULT + b * BEAT for b in range(int((PULL_BACK - RESULT) / BEAT))]
for t0 in kicks:
    t = np.arange(int(SR * 0.45)) / SR
    v = np.sin(2 * np.pi * np.cumsum(44 + 110 * np.exp(-t / 0.035)) / SR) * np.exp(-t / 0.26)
    place(drums, v, t0, 0.5)
duck = np.ones(N)
for t0 in kicks:
    i = int(t0 * SR); n = min(int(SR * 0.4), N - i)
    duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.45 * np.exp(-np.arange(n) / SR / 0.11))
for b in (pad, arp, bass):
    b *= duck

# typed request: soft key clicks
for i, t0 in enumerate(TYPED):
    n = int(SR * 0.04)
    t = np.arange(n) / SR
    click = np.diff(rng.standard_normal(n + 1)) * np.exp(-t / 0.006) + 0.4 * np.sin(2 * np.pi * (1800 + 300 * (i % 3)) * t) * np.exp(-t / 0.01)
    place(fx, click, t0, 0.05, pan=(i % 5 - 2) * 0.08)


def bell(t0, m, gain=1.0, pan=0.0):
    t = np.arange(int(SR * 2.4)) / SR
    f = midi(m)
    v = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for r, a, d in ((1, 1, 1.6), (2.76, .5, .9), (5.4, .25, .5), (8.93, .12, .3)))
    place(fx, v * np.minimum(1, t / 0.002), t0, 0.07 * gain, pan)


def swell(t_end, length, gain=1.0, up=True):
    n = int(SR * length)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    shape = (t / length) ** 2.2 if up else np.exp(-t / (length / 3))
    cut = 300 * (1 + 40 * shape)
    a = np.exp(-2 * np.pi * cut / SR)
    out, y = np.zeros(n), 0.0
    for i in range(n):
        y = (1 - a[i]) * noise[i] + a[i] * y
        out[i] = y
    v = out * 1.6 * shape
    place(fx, np.vstack([v, np.roll(v, 240)]), t_end - length if up else t_end, 0.2 * gain)


def impact(t0, gain=1.0):
    t = np.arange(int(SR * 2.2)) / SR
    boom = np.sin(2 * np.pi * np.cumsum(30 + 34 * np.exp(-t / 0.25)) / SR) * np.exp(-t / 0.75)
    hit = lowpass(rng.standard_normal(len(t)), 2400) * np.exp(-t / 0.18)
    place(fx, boom, t0, 0.65 * gain)
    place(fx, np.vstack([hit, np.roll(hit, 400)]), t0, 0.45 * gain)


swell(SEND + 0.05, 0.5, 0.5)                 # the request leaves the input bar
for i, t0 in enumerate(STEP_DONE):           # each completed step
    bell(t0, 88 + 2 * i, 0.55, pan=-0.25 + 0.25 * i)
swell(RESULT, 1.2, 0.9); impact(RESULT, 0.9); bell(RESULT, 81, 0.9)
swell(PULL_BACK, 1.4, 0.7, up=False)        # pull-back whoosh
for t0, m in zip(LINES, (84, 88)):
    bell(t0, m, 0.6, pan=0.15)
swell(END, 1.0, 0.6); impact(END, 0.6); bell(END + 0.15, 81, 1.2); bell(END + 0.15, 88, 0.7, pan=0.3)

# mix
ir_n = int(SR * 2.8)
ir_t = np.arange(ir_n) / SR
ir = np.vstack([lowpass(rng.standard_normal(ir_n), 5000), lowpass(rng.standard_normal(ir_n), 5000)]) * np.exp(-ir_t / 0.6)
ir /= np.abs(ir).sum(axis=1, keepdims=True) ** 0.5 * 12
send = pad * 0.6 + arp * 0.9 + fx * 0.5
wet = np.vstack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
mixed = pad + arp + bass + drums + fx + wet * 0.9
t = np.arange(N) / SR
mixed *= np.minimum(1, t / 0.3) * np.clip((DUR - t) / 1.2, 0, 1)
mixed = np.tanh(mixed * 1.4) / np.tanh(1.4)
mixed *= 0.89 / np.abs(mixed).max()
wavfile.write(sys.argv[1], SR, mixed.T.astype(np.float32))
print(sys.argv[1])
