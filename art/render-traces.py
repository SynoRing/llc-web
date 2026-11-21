"""Build the hero texture from the two-hand take. Usage: render-traces.py 9465182.mp4"""

import argparse
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image


def sample_fingertips(clip):
    width, height = 420, 236
    command = [
        "ffmpeg", "-v", "error", "-ss", "3.7", "-t", "11.6", "-i", str(clip),
        "-an", "-vf", f"fps=18,scale={width}:{height}", "-pix_fmt", "rgb24",
        "-f", "rawvideo", "-",
    ]
    frames = np.frombuffer(subprocess.check_output(command), dtype=np.uint8)
    percentiles = np.linspace(.015, .985, 47)
    profiles = []
    for frame in frames.reshape(-1, height, width, 3):
        red, green, blue = frame.astype(np.int16).transpose(2, 0, 1)
        # The leftmost part of the skin silhouette isolates the fingertips in this take.
        y, x = np.nonzero((red - green > 12) & (red - blue > 12))
        tip = np.quantile(x, .045)
        profiles.append(np.quantile(y[x < tip + 19], percentiles) / height)

    tracks = np.array(profiles)
    for _ in range(5):
        padded = np.pad(tracks, ((1, 1), (0, 0)), mode="edge")
        tracks = (padded[:-2] + 2 * tracks + padded[2:]) / 4
    return tracks


def expose(tracks):
    width, height = 1920, 910
    x = np.linspace(0, 1, width)
    y = np.arange(height)[:, None] / height
    time = np.linspace(0, 1, len(tracks))
    exposure = np.zeros((height, width))
    for index, track in enumerate(tracks.T):
        depth = index / (tracks.shape[1] - 1)
        movement = np.interp(x, time, track)
        axis = .905 - .775 * x**1.64 + .34 * (movement - .41)
        spread = .18 + .10 * np.cos(2 * np.pi * x + .9) + .23 * x**2
        center = axis + (depth - .5) * spread + .028 * np.sin(5 * depth + 4.8 * x)
        offset = (y - center) * 1024

        light = (.40 + .55 * np.sin(np.pi * depth)**.6) * (.48 + .52 * np.cos(4.6 * x - 2 * depth)**2)
        grains = .5 + .5 * np.cos(2 * np.pi * (x * (195 + index * .25) + depth))
        line = np.exp(-.5 * (offset / (.59 + .37 * depth))**2)
        exposure += light * (34 if index % 7 == 0 else 15) * line * (.68 + .32 * grains)
        exposure += light * (1.1 + 1.5 * depth) * np.exp(-.5 * (offset / (6 + 9 * depth))**2)
        if index in (4, 23, 40):
            sample = np.maximum(0, np.cos(2 * np.pi * (x * width / (16 + index * .3) + depth)))**18
            exposure += light * 45 * sample * np.exp(-.5 * (offset / 1.35)**2)

    exposure += 8 * np.exp(-.5 * (((x - .72) / .33)**2 + ((y - .59) / .41)**2))
    exposure += 4.5 * np.exp(-.5 * (((x - .28) / .55)**2 + ((y - 1.07) / .29)**2))
    exposure *= np.clip(y / .20, 0, 1)
    mask = Image.fromarray(np.clip(np.rint(exposure * 2.5), 0, 255).astype(np.uint8))
    plate = Image.new("RGBA", (width, height), "white")
    plate.putalpha(mask)
    return plate


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("clip", type=Path)
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / "public/assets/gesture-traces.webp"
    expose(sample_fingertips(args.clip)).save(output, method=6, alpha_quality=100)
