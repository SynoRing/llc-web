"""Draw the hero's SVG signal from the two-hand take. Usage: render-traces.py 9465182.mp4"""

import argparse
import subprocess
from pathlib import Path

import numpy as np


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


def bezier_path(x, y):
    # Knots are equally spaced. Reflecting each incoming handle gives a continuous tangent.
    handle = (x[1] - x[0]) / 3
    rise = np.gradient(y, x) * handle
    sections = [f"M{x[0]:.1f},{y[0]:.1f} C{x[0]+handle:.1f},{y[0]+rise[0]:.1f}"]
    for i in range(1, len(x)):
        command = "" if i == 1 else "S"
        sections.append(f"{command}{x[i]-handle:.1f},{y[i]-rise[i]:.1f} {x[i]:.1f},{y[i]:.1f}")
    return " ".join(sections)


def draw_svg(tracks):
    width, height = 1920, 910
    x = np.linspace(0, 1, 73)
    time = np.linspace(0, 1, len(tracks))
    paths = []
    for index, track in enumerate(tracks.T):
        depth = index / (tracks.shape[1] - 1)
        movement = np.interp(x, time, track)
        axis = .905 - .775 * x**1.64 + .34 * (movement - .41)
        spread = .18 + .10 * np.cos(2 * np.pi * x + .9) + .23 * x**2
        center = axis + (depth - .5) * spread + .028 * np.sin(5 * depth + 4.8 * x)
        # Thin the outer threads and taper their ink, leaving the space between them transparent.
        envelope = np.sin(np.pi * depth)**.85
        ink = .018 + envelope * (.14 + .075 * np.cos(index * .93)**2)
        weight = .56 + .64 * envelope
        curve = bezier_path(x * width, center * height)
        paths.append(f'    <path stroke-width="{weight:.2f}" '
                     f'stroke-opacity="{ink:.3f}" d="{curve}"/>')

    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        'preserveAspectRatio="none" focusable="false">',
        '  <defs>',
        '    <linearGradient id="trace-ink" gradientUnits="userSpaceOnUse" x2="0" y2="150">',
        '      <stop stop-color="#a7b1ba" stop-opacity="0"/>',
        '      <stop offset="1" stop-color="#a7b1ba"/>',
        '    </linearGradient>',
        '  </defs>',
        '  <g stroke="url(#trace-ink)" opacity=".84" fill="none" stroke-linecap="round">',
        *paths,
        '  </g>',
        '</svg>',
        '',
    ])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("clip", type=Path)
    args = parser.parse_args()
    output = Path(__file__).with_name("gesture-traces.svg")
    output.write_text(draw_svg(sample_fingertips(args.clip)), encoding="utf-8")
