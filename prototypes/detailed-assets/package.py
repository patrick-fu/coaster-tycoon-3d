"""Package verified asset exports on Grok Bot; do not run on Patrick's Mac."""

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", type=Path, required=True)
    options = parser.parse_args()
    root = options.workspace
    site = root / "site"
    vendor = site / "vendor"
    vendor.mkdir(exist_ok=True)
    three = root / "checks/node_modules/three"
    for name in ["three.module.js", "three.core.js"]:
        shutil.copyfile(three / "build" / name, vendor / name)
    src = (three / "examples/jsm").resolve()
    done = set()

    def copy_addon(relative):
        file = (src / relative).resolve()
        if not file.is_relative_to(src):
            raise ValueError("Dependency escapes addon source tree")
        if file in done:
            return
        done.add(file)
        target = vendor / "addons" / file.relative_to(src)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file, target)
        for dependency in re.findall(r"from\s+['\"](\.{1,2}/[^'\"]+\.js)['\"]", file.read_text()):
            copy_addon((file.parent / dependency).relative_to(src))

    for name in ["controls/OrbitControls.js", "loaders/GLTFLoader.js", "environments/RoomEnvironment.js"]:
        copy_addon(Path(name))
    shutil.copyfile(three / "LICENSE", vendor / "THREE-LICENSE.txt")
    models = site / "models"
    models.mkdir(exist_ok=True)
    titles = {
        "wooden-car": ("Wooden coaster car", "Four seats · shaped shell · articulated wheel groups"),
        "timber-station": ("Timber station", "Modular roof and platform · gates · 4 m candidate pitch"),
        "information-kiosk": ("Information kiosk", "Four counters · map and umbrella props"),
    }
    entries = []
    for asset, (title, subtitle) in titles.items():
        report = json.loads((root / "outputs" / (asset + ".json")).read_text())
        file = root / "outputs" / (asset + ".glb")
        if hashlib.sha256(file.read_bytes()).hexdigest() != report["glb"]["sha256"]:
            raise ValueError("Export hash mismatch: " + asset)
        shutil.copyfile(file, models / file.name)
        entries.append({"id": asset, "title": title, "subtitle": subtitle,
                        "glb": "./models/" + file.name, "report": report})
    (site / "asset-index.json").write_text(json.dumps(entries, indent=2) + "\n")
    (site / "ASSET-NOTICES.txt").write_text(
        "Coaster Tycoon 3D independently authored asset laboratory. Project source and authored geometry: MIT.\n"
        "Three.js 0.186.1: MIT, see vendor/THREE-LICENSE.txt.\n"
        "Materials from ambientCG (https://ambientcg.com), CC0-1.0 (https://docs.ambientcg.com/license/):\n"
        "Wood096, WoodFloor043, RoofingTiles013A, Metal049A, Fabric081C, Bricks051.\n"
        "Individual files/source hashes are recorded in the asset-index export reports.\n"
        "Original RCT2 screenshots, game objects, source code and commercial textures are not bundled.\n"
        "Candidate dimensions and poses do not establish original gameplay/metric parity or visual acceptance.\n")
    outputs = [{"path": str(file.relative_to(site)), "bytes": file.stat().st_size,
                "sha256": hashlib.sha256(file.read_bytes()).hexdigest()}
               for file in sorted(site.rglob("*")) if file.is_file() and file.name not in ("output-manifest.json", "validate.mjs")]
    (site / "output-manifest.json").write_text(json.dumps({"files": outputs}, indent=2) + "\n")
    print(json.dumps({"assets": len(entries), "addonModules": len(done), "files": len(outputs),
                      "bytes": sum(file["bytes"] for file in outputs)}))


if __name__ == "__main__":
    main()
