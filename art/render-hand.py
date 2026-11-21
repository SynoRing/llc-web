"""Sample three photographed gestures onto one fixed silver dot matrix."""
import argparse
from dataclasses import dataclass
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageFilter

WIDTH, HEIGHT = 1296, 906
SAMPLE_W, SAMPLE_H = 648, 453
FPS = 30
PITCH = 9.7
BACKGROUND = 16
JOIN_FRAMES = 10
# The loop begins mid-extension. Its last frame leads into this same recorded shot.
OPENING_FRAME = 43
rng = np.random.default_rng(9465544)


@dataclass(frozen=True)
class Shot:
    source: str
    start: float
    end: float
    frames: int
    framing: str
    black: int
    white: int
    fade_wrists: bool = False


SHOTS = (
    Shot('9465544', 3.12, 4.82, 79, 'scale=720:1280,transpose=2,crop=1028:718:185:0', 34, 180),
    Shot('9019587', 2.00, 5.13, 112, 'scale=720:1280,transpose=2,crop=650:454:377:73', 52, 201),
    Shot('9465182', 4.55, 8.05, 118, 'scale=1280:720,crop=1080:720:130:0,pad=1080:754:0:34:color=gray', 48, 188, True),
)


def grid():
    row, col = np.mgrid[:int(HEIGHT / PITCH) + 1, :int(WIDTH / PITCH) + 1]
    # Fixed jitter preserves open space without adding temporal noise to the skin.
    x = (col + .28 + (row % 2) * .5 + rng.uniform(-.20, .20, col.shape)) * PITCH
    y = (row + .42 + rng.uniform(-.15, .15, row.shape)) * PITCH
    return np.column_stack((x.ravel(), y.ravel())).astype('float32')


positions = grid()
fine_positions = positions + [PITCH * .26, PITCH * .48]
variation = rng.uniform(0, 1, len(positions)).astype('float32')
kernel_y, kernel_x = np.mgrid[-4:5, -4:5]
kernel_x, kernel_y = kernel_x.ravel(), kernel_y.ravel()


def blur(values, radius):
    image = Image.fromarray(np.clip(values, 0, 255).astype('uint8'))
    return np.asarray(image.filter(ImageFilter.GaussianBlur(radius)), dtype='float32')


def sample(values, coords):
    x = np.clip(coords[:, 0] * SAMPLE_W / WIDTH, 0, SAMPLE_W - 1.001)
    y = np.clip(coords[:, 1] * SAMPLE_H / HEIGHT, 0, SAMPLE_H - 1.001)
    ix, iy = x.astype(int), y.astype(int)
    fx, fy = x - ix, y - iy
    top = values[iy, ix] * (1 - fx) + values[iy, ix + 1] * fx
    bottom = values[iy + 1, ix] * (1 - fx) + values[iy + 1, ix + 1] * fx
    return (top * (1 - fy) + bottom * fy).astype('float32')


def capture(rgb, shot):
    red, green, blue = rgb.transpose(2, 0, 1)
    # Skin is warmer than either studio backdrop. Keep antialiased edge coverage.
    matte = np.clip((np.minimum(red - green, red - blue) - 2) / 10, 0, 1)
    if shot.fade_wrists:
        # Let the two wrists dissolve into the field before the bottom of the shoot.
        y = np.arange(SAMPLE_H)[:, None] / SAMPLE_H
        fade = np.clip((.99 - y) / .185, 0, 1)
        matte *= fade * fade * (3 - 2 * fade)
    luma = rgb @ np.array([.30, .58, .12], 'float32')
    broad = blur(luma * matte, 7) / np.maximum(blur(matte * 255, 7) / 255, .05)
    near = blur(luma * matte, 1.8) / np.maximum(blur(matte * 255, 1.8) / 255, .05)
    tone = np.clip((luma - shot.black) / (shot.white - shot.black) + (luma - broad) * .018 + (luma - near) * .014, .035, 1)
    contour = np.clip((1 - blur(matte * 255, 2.4) / 255) * 2.2, 0, 1)
    detail = np.clip(np.abs(luma - near) / 17, 0, 1)
    return np.stack((sample(tone * matte, positions), sample(matte, positions),
                     sample(matte * np.maximum(contour, detail * .80), fine_positions)))


def read_capture(source_dir, shot):
    file = source_dir / f"{shot.source}.mp4"
    filters = f"{shot.framing},scale={SAMPLE_W}:{SAMPLE_H}:flags=lanczos"
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(shot.start), '-t', str(shot.end - shot.start),
           '-i', str(file), '-vf', filters, '-an', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    samples = []
    frame_size = SAMPLE_W * SAMPLE_H * 3
    with subprocess.Popen(cmd, stdout=subprocess.PIPE) as decoder:
        while data := decoder.stdout.read(frame_size):
            rgb = np.frombuffer(data, 'uint8').reshape(SAMPLE_H, SAMPLE_W, 3)
            samples.append(capture(rgb.astype('float32'), shot))
        if decoder.wait() or len(samples) < 2:
            raise ValueError(f"Could not read the gesture from {file}.")

    frames = np.linspace(0, len(samples) - 1, shot.frames, dtype='float32')
    before = frames.astype(int)
    after = np.minimum(before + 1, len(samples) - 1)
    fraction = (frames - before).astype('float32')[:, None, None]
    samples = np.asarray(samples)
    return samples[before] * (1 - fraction) + samples[after] * fraction


def sequence(source_dir):
    shots = [read_capture(source_dir, shot) for shot in SHOTS]
    # Each cell switches to the incoming photograph once as the scan travels across.
    threshold = (.20 + .60 * positions[:, 0] / WIDTH + .20 * variation).astype('float32')
    timeline = []
    for index, current in enumerate(shots):
        previous = shots[index - 1]
        for j in range(JOIN_FRAMES):
            mix = np.clip(((j + .5) / JOIN_FRAMES - threshold) * 4 + .5, 0, 1)
            timeline.append(previous[j - JOIN_FRAMES] * (1 - mix) + current[j] * mix)
        timeline.extend(current[JOIN_FRAMES:-JOIN_FRAMES])
    return timeline[OPENING_FRAME:] + timeline[:OPENING_FRAME]


def deposit(canvas, xy, radius, intensity, tint):
    keep = intensity > 4
    x, y = xy[keep].T
    px = np.floor(x).astype(int)[:, None] + kernel_x
    py = np.floor(y).astype(int)[:, None] + kernel_y
    distance = np.hypot(px - x[:, None], py - y[:, None])
    coverage = np.clip(radius[keep, None] + .5 - distance, 0, 1)
    inside = (coverage > 0) & (px >= 0) & (px < WIDTH) & (py >= 0) & (py < HEIGHT)
    light = (intensity[keep, None] * coverage)[inside]
    colors = np.clip(BACKGROUND + light[:, None] * tint, 0, 255).astype('uint8')
    np.maximum.at(canvas.reshape(-1, 3), (py[inside] * WIDTH + px[inside]), colors)


def render(timeline, frame):
    phase = frame / len(timeline)
    tone, matte, features = timeline[frame]
    past = timeline[(frame - 2) % len(timeline)][0]
    # Sweep just the exposed dots. A brief cool afterimage follows fast fingertips.
    coordinate = (positions[:, 0] * .85 + positions[:, 1] * .30) / WIDTH
    offset = (coordinate - 2 * phase + .5) % 1 - .5
    scan = np.exp(-.5 * (offset / .031) ** 2)
    wake = np.exp(-.5 * ((offset - .040) / .021) ** 2)
    trail = np.clip(past - tone - .06, 0, 1)
    # Slight lateral registration error only along the moving read head.
    recorded = positions.copy()
    row = np.floor(positions[:, 1] / PITCH)
    recorded[:, 0] += 3.1 * scan * np.sin(row * .63)
    canvas = np.full((HEIGHT, WIDTH, 3), BACKGROUND, 'uint8')
    deposit(canvas, positions + [2.4, .7], .95 + trail * 1.1, trail * 146, [.52, .72, .98])
    # Sparse low-light samples make the palm creases and nails interrupt the field.
    ink = np.clip((tone + .16 - variation * .38) / .24, 0, 1)
    intensity = matte * ink * (68 + 162 * tone + scan * 36) * (1 - .32 * wake)
    radius = 1.42 + 1.72 * tone ** .70 + (variation - .5) * .46 + .15 * scan
    deposit(canvas, positions + [3.4, 0], 1.05 + tone, matte * scan * tone * 90, [.50, .76, 1])
    deposit(canvas, recorded, radius, intensity, [.92, .965, 1])
    deposit(canvas, fine_positions, 1.05 + .65 * features, features * (128 + 42 * scan),
            [.84, .93, 1])
    return Image.fromarray(canvas)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_dir', type=Path, help='Folder containing the three Pexels clips named by ID')
    parser.add_argument('--out', type=Path, default=Path(__file__).resolve().parents[1] / 'public/assets')
    parser.add_argument('--proof', type=Path, help='Render a still sheet instead of the film')
    args = parser.parse_args()
    timeline = sequence(args.source_dir)
    if args.proof:
        sheet = Image.new('RGB', (1296, 604), (16, 16, 16))
        for i, phase in enumerate([0, .14, .32, .49, .66, .85]):
            still = render(timeline, round(phase * len(timeline)))
            sheet.paste(still.resize((432, 302), Image.Resampling.LANCZOS),
                        (i % 3 * 432, i // 3 * 302))
        sheet.save(args.proof)
        return
    args.out.mkdir(parents=True, exist_ok=True)
    render(timeline, 0).save(args.out / 'gesture-sequence.webp', lossless=True)
    cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
           '-s', f'{WIDTH}x{HEIGHT}', '-r', str(FPS), '-i', '-', '-an', '-c:v', 'libx264',
           '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
           str(args.out / 'gesture-sequence.mp4')]
    with subprocess.Popen(cmd, stdin=subprocess.PIPE) as encoder:
        for frame in range(len(timeline)):
            encoder.stdin.write(render(timeline, frame).tobytes())
        encoder.stdin.close()
        if encoder.wait():
            raise RuntimeError("Could not encode the gesture study.")


if __name__ == '__main__':
    main()
