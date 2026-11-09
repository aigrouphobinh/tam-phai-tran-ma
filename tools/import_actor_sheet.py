#!/usr/bin/env python3
"""Import an authored 4-column, 8-state RGBA sprite sheet (requires Pillow).

No poses are synthesized. One shared scale is used for the whole character,
including collapsed poses. Columns retain their original horizontal registration;
only the ground line is aligned, using opaque pixels rather than spell glows.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

STATES = ["idle", "run", "attack", "cast", "hit", "down", "revive", "victory"]
DURATIONS = dict(zip(STATES, [2.1, .56, .55, 1.14, .48, .65, 1.1, 1.9]))


def trim_neighbor_fragments(cell):
    """Remove tiny disconnected pieces cut off from an adjacent source cell.

    Keep the main silhouette and all interior pieces (e.g. a floating lotus).
    An edge-touching fragment must be <1.5% of the cell to be discarded.
    """
    alpha = cell.getchannel("A")
    width, height = cell.size
    pixels = bytearray(alpha.point(lambda a: 1 if a >= 64 else 0).tobytes())
    for start, value in enumerate(pixels):
        if not value:
            continue
        pixels[start] = 0
        pending, count = [start], 0
        left, top, right, bottom = width, height, 0, 0
        while pending:
            index = pending.pop()
            x, y = index % width, index // width
            count += 1
            left, top, right, bottom = min(left, x), min(top, y), max(right, x), max(bottom, y)
            for nx, ny in ((x-1, y), (x+1, y), (x, y-1), (x, y+1)):
                if 0 <= nx < width and 0 <= ny < height:
                    neighbor = ny * width + nx
                    if pixels[neighbor]:
                        pixels[neighbor] = 0
                        pending.append(neighbor)
        if count < width * height * .015 and (left <= 1 or right >= width-2 or top <= 1 or bottom >= height-2):
            alpha.paste(0, (max(0, left-2), max(0, top-2), min(width, right+3), min(height, bottom+3)))
    cell.putalpha(alpha)
    return cell


def build(source, actor, output, size=256):
    if actor not in {"kiem", "huyen", "linh", "boss", "boss-red", "boss-ice", "boss-storm", "boss-gold"}:
        raise ValueError("Unknown actor")
    image = Image.open(source).convert("RGBA")
    if abs(image.height / image.width - 2) > .02:
        raise ValueError("Expected a 4 by 8 sheet with square cells")
    cells, grounds = [], []
    for i in range(32):
        x, y = i % 4, i // 4
        # Fractional boundaries support e.g. 887x1774 source art without
        # discarding the rightmost column or accumulating registration error.
        box = (round(x * image.width / 4), round(y * image.height / 8),
               round((x + 1) * image.width / 4), round((y + 1) * image.height / 8))
        cell = trim_neighbor_fragments(image.crop(box))
        alpha = cell.getchannel("A")
        core = alpha.point(lambda a: 255 if a >= 192 else 0).getbbox()
        if not core:
            raise ValueError(f"Missing opaque character in frame {i + 1}")
        # Discard near-invisible extraction noise, preserve soft visible glow.
        cell.putalpha(alpha.point(lambda a: a if a >= 8 else 0))
        cells.append(cell)
        grounds.append(core[3])
    scale = min(size * .94 / max(c.width for c in cells),
                size * .91 / max(grounds))
    atlas = Image.new("RGBA", (4 * size, 8 * size))
    for i, (cell, ground) in enumerate(zip(cells, grounds)):
        frame = cell.resize((round(cell.width * scale), round(cell.height * scale)),
                            Image.Resampling.LANCZOS)
        x = (i % 4) * size + (size - frame.width) // 2
        y = (i // 4) * size + round(size * .97 - ground * scale)
        # Clip each destination frame so a spell halo cannot bleed into
        # the next state row when decoded as a single GPU/browser bitmap.
        tile = Image.new("RGBA", (size, size))
        tile.alpha_composite(frame, (x - (i % 4) * size, y - (i // 4) * size))
        atlas.alpha_composite(tile, ((i % 4) * size, (i // 4) * size))
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    name = f"{actor}-states-v2.webp"
    atlas.save(output / name, "WEBP", quality=94, method=4)
    clips = {}
    for row, state in enumerate(STATES):
        clip = dict(texture=f"/assets/characters/{name}", frames=4,
                    startFrame=row * 4, columns=4, rows=8,
                    frameWidth=size, frameHeight=size,
                    fps=round(4 / DURATIONS[state], 6),
                    loop=state in {"idle", "run", "victory"}, renderScale=1.12)
        if state in {"attack", "cast", "hit", "revive"}:
            clip["syncToAction"] = True
        # A basic weapon contact is 240ms into a .55s server action.
        # The attack contact pose is cell 2; the casting release is cell 3.
        if state == "attack":
            clip["frameTimes"] = [0, .24 / .55, .68, .88]
        if state == "cast":
            clip["frameTimes"] = [0, .20, .24 / .55, .82]
        clips[state] = clip
    if actor == "boss" or actor.startswith("boss-"):
        # Telegraph holds the raised weapon until the authoritative impact.
        clips["windup"] = {**clips["cast"], "frames": 2, "fps": 2 / 2.2,
                           "frameTimes": [0, .35], "syncToAction": False}
        # Damage/SFX happen on entry into impact: begin on the contact pose.
        clips["impact"] = {**clips["attack"], "startFrame": 10, "frames": 2,
                           "frameTimes": [0, .58], "fps": 2 / .55}
        clips["stun"] = {**clips["hit"]}
        clips["phase"] = {**clips["cast"]}
        clips["attack"] = {**clips["attack"], "frameTimes": [0, .18, .44, .82]}
    anchor = [.5, .97]
    if actor.startswith("boss-"):
        mask = atlas.crop((0, 0, size, size)).getchannel("A").point(lambda a: 255 if a >= 192 else 0)
        bottom = mask.getbbox()[3]
        feet = [x for y in range(max(0, bottom - round(size / 8)), bottom)
                for x in range(size) if mask.getpixel((x, y))]
        anchor[0] = round(sum(feet) / len(feet) / size, 6)
    metadata = dict(actor=actor, importerVersion=2, webpQuality=94, webpMethod=4,
                    sourceSha256=hashlib.sha256(Path(source).read_bytes()).hexdigest(),
                    sourceSize=list(image.size), outputSize=list(atlas.size),
                    scale=scale, groundAnchor=anchor,
                    provenance="Original artwork generated from the project's existing character reference",
                    animations=clips)
    (output / f"{actor}-states-v2.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--actor", required=True)
    parser.add_argument("--output", type=Path, default=Path("public/assets/characters"))
    args = parser.parse_args()
    result = build(args.input, args.actor, args.output)
    print(f"{args.actor}: 32 painted frames -> {result['outputSize']}")
