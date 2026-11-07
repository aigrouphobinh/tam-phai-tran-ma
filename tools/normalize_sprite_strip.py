#!/usr/bin/env python3
"""Normalize artist-authored transparent sprite strips to a stable 2D atlas.

Usage:
  python tools/normalize_sprite_strip.py --input art/kiem-attack.png \
    --actor kiem --state attack --frames 8 --input-columns 8 \
    --output-dir public/assets/characters --frame-size 256 --fps 14

Requires Pillow (open source): python -m pip install Pillow
The input must contain REAL action poses. This tool does not invent limb motion.
"""
import argparse
import json
import math
import re
from pathlib import Path
from PIL import Image

ACTORS = {"kiem", "huyen", "linh", "boss"}
STATES = {"idle", "run", "attack", "cast", "hit", "down", "revive",
          "victory", "windup", "impact", "stun", "phase"}


def build(input_path, output_dir, actor, state, frame_count, input_columns,
          frame_size=256, fps=12, loop=True, output_columns=8):
    if actor not in ACTORS or state not in STATES:
        raise ValueError("Unknown actor or animation state")
    if not 1 <= frame_count <= 256 or not 1 <= input_columns <= 32:
        raise ValueError("Invalid source layout")
    if frame_count > 256 or not 64 <= frame_size <= 1024 or not 1 <= fps <= 60:
        raise ValueError("Invalid frame size/FPS")
    if not 1 <= output_columns <= 16:
        raise ValueError("Invalid atlas columns")

    image = Image.open(input_path).convert("RGBA")
    nrows = math.ceil(frame_count / input_columns)
    if image.width % input_columns or image.height % nrows:
        raise ValueError("Input dimensions must divide into equal sprite cells")
    cell_w, cell_h = image.width // input_columns, image.height // nrows
    regions = []
    boxes = []
    for i in range(frame_count):
        x = (i % input_columns) * cell_w
        y = (i // input_columns) * cell_h
        source = image.crop((x, y, x + cell_w, y + cell_h))
        bbox = source.getchannel("A").getbbox()
        if bbox is None:
            raise ValueError(f"Frame {i + 1} is entirely transparent")
        regions.append(source)
        boxes.append(bbox)

    # One scale for EVERY frame: there is no per-frame zoom/flicker.
    max_w = max(b[2] - b[0] for b in boxes)
    max_h = max(b[3] - b[1] for b in boxes)
    scale = min(frame_size * 0.89 / max_w, frame_size * 0.91 / max_h)
    columns = min(output_columns, frame_count)
    rows = math.ceil(frame_count / columns)
    atlas = Image.new("RGBA", (columns * frame_size, rows * frame_size), (0, 0, 0, 0))
    for index, (region, box) in enumerate(zip(regions, boxes)):
        cropped = region.crop(box)
        w = max(1, round(cropped.width * scale))
        h = max(1, round(cropped.height * scale))
        normalized = cropped.resize((w, h), Image.Resampling.LANCZOS)
        # Shared ground line. Assumes every source frame has the feet in view.
        x = (index % columns) * frame_size + (frame_size - w) // 2
        y = (index // columns) * frame_size + frame_size - int(frame_size * 0.045) - h
        atlas.alpha_composite(normalized, (x, y))

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    name = f"{actor}-{state}"
    atlas_path = output_dir / f"{name}.webp"
    atlas.save(atlas_path, "WEBP", quality=94, method=6)
    clip = {
        "texture": f"/assets/characters/{name}.webp",
        "frames": frame_count,
        "columns": columns,
        "rows": rows,
        "frameWidth": frame_size,
        "frameHeight": frame_size,
        "fps": fps,
        "loop": loop,
    }
    (output_dir / f"{name}.clip.json").write_text(
        json.dumps(clip, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return atlas_path, clip


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--actor", required=True)
    parser.add_argument("--state", required=True)
    parser.add_argument("--frames", type=int, required=True)
    parser.add_argument("--input-columns", type=int, required=True)
    parser.add_argument("--frame-size", type=int, default=256)
    parser.add_argument("--fps", type=int, default=12)
    parser.add_argument("--atlas-columns", type=int, default=8)
    parser.add_argument("--no-loop", action="store_true")
    args = parser.parse_args()
    path, clip = build(
        args.input, args.output_dir, args.actor, args.state, args.frames,
        args.input_columns, args.frame_size, args.fps, not args.no_loop,
        args.atlas_columns,
    )
    print(f"OK: {path} — {clip['frames']} frames; manifest clip:")
    print(json.dumps(clip, ensure_ascii=False, indent=2))
