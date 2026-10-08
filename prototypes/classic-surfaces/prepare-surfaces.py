"""Derive compact runtime maps from the two SHA-pinned CC0 PNG bundles."""

import hashlib
import io
import json
import math
import pathlib
import zipfile

from PIL import Image, __version__ as pillow_version

ROOT = pathlib.Path(__file__).resolve().parent
SOURCE = ROOT / "sources"
OUTPUT = ROOT / "prepared"
OUTPUT.mkdir(exist_ok=True)
inputs = json.loads((SOURCE / "material-inputs.json").read_text())


def sha(data):
    return hashlib.sha256(data).hexdigest()


def linear_colour(image, target):
    bands = []
    for channel in image.convert("RGB").split():
        plane = Image.new("F", image.size)
        plane.putdata([(v / 255 / 12.92 if v <= 10 else ((v / 255 + .055) / 1.055) ** 2.4)
                       for v in channel.getdata()])
        plane = plane.resize(target, Image.Resampling.LANCZOS)
        band = Image.new("L", target)
        values = [min(1, max(0, v)) for v in plane.getdata()]
        band.putdata([round(255 * (v * 12.92 if v <= .0031308 else 1.055 * v ** (1 / 2.4) - .055))
                      for v in values])
        bands.append(band)
    return Image.merge("RGB", bands)


def normal_colour(image, target):
    # BOX averages encoded tangent vectors; renormalization preserves a unit normal.
    reduced = image.convert("RGB").resize(target, Image.Resampling.BOX)
    pixels = []
    for pixel in reduced.getdata():
        vector = [v / 127.5 - 1 for v in pixel]
        length = math.sqrt(sum(v * v for v in vector))
        if length < .000001:
            raise ValueError("Degenerate source normal")
        pixels.append(tuple(round((v / length + 1) * 127.5) for v in vector))
    reduced.putdata(pixels)
    return reduced


outputs = []
for asset in inputs["assets"]:
    bundle = SOURCE / pathlib.Path(asset["bundle"]["path"]).name
    raw_bundle = bundle.read_bytes()
    if len(raw_bundle) != asset["bundle"]["bytes"] or sha(raw_bundle) != asset["bundle"]["sha256"]:
        raise ValueError("Source bundle identity mismatch: " + asset["id"])
    role = {"Grass001": "grass", "PavingStones150": "paving"}[asset["id"]]
    with zipfile.ZipFile(bundle) as archive:
        for suffix, purpose in [("Color", "color"), ("NormalGL", "normal"), ("Roughness", "roughness")]:
            name = asset["id"] + "_1K-PNG_" + suffix + ".png"
            source = archive.read(name)
            record = next(m for m in asset["members"] if m["name"] == name)
            if len(source) != record["bytes"] or sha(source) != record["sha256"]:
                raise ValueError("Source image identity mismatch: " + name)
            image = Image.open(io.BytesIO(source))
            if image.format != "PNG" or image.size[0] != 1024 or image.size[1] not in (512, 1024):
                raise ValueError("Unexpected image dimensions/format")
            if "A" in image.getbands() and image.getextrema()[-1] != (255, 255):
                raise ValueError("Unexpected source transparency")
            target = (512, image.height // 2)
            if purpose == "color":
                derived = linear_colour(image, target)
                operation = "sRGB decode; linear-light Lanczos downsample; sRGB encode to RGB8"
            elif purpose == "normal":
                derived = normal_colour(image, target)
                operation = "Pillow 16-bit RGB decode to RGB8; BOX downsample; tangent-vector renormalization; no Y flip"
            else:
                if image.mode != "L" or source[24] != 8:
                    raise ValueError("Roughness requires the acquired 8-bit grayscale source")
                derived = image.resize(target, Image.Resampling.BOX)
                operation = "linear 8-bit scalar BOX downsample"
            output = OUTPUT / (role + "-" + purpose + ".png")
            derived.save(output, format="PNG", optimize=True)
            outputs.append({"path": output.name, "bytes": output.stat().st_size,
                            "sha256": sha(output.read_bytes()), "assetId": asset["id"],
                            "purpose": purpose, "sourceBundleSha256": asset["bundle"]["sha256"],
                            "sourceMember": name, "sourceSha256": sha(source),
                            "sourceSize": list(image.size), "sourcePngBits": source[24],
                            "size": list(target), "mode": derived.mode, "operation": operation,
                            "colorSpace": "sRGB" if purpose == "color" else "linear data"})

manifest = {"license": "CC0-1.0", "provider": "ambientCG", "pillowVersion": pillow_version,
            "preparationSourceSha256": sha(pathlib.Path(__file__).read_bytes()), "files": outputs,
            "totalBytes": sum(row["bytes"] for row in outputs),
            "scope": "Derived image resources only; no geometry, original or human visual acceptance"}
(OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({"files": len(outputs), "bytes": manifest["totalBytes"],
                  "manifestSha256": sha((OUTPUT / "manifest.json").read_bytes())}))
