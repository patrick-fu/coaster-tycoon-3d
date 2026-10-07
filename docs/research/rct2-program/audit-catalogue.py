"""Produce reference inventories; never import upstream game code or image data."""

import argparse
import csv
import hashlib
import json
import re
import subprocess
from collections import Counter
from decimal import Decimal
from pathlib import Path

OBJECTS_SHA = "978f596972c1163dc670d853dd6add4766f10dbd"
CORE_SHA = "11513222890717e81431c83a28aafb7555f2ccd2"
SPLITS = {"hypercoaster": 19, "hyper_twister": 51, "monster_trucks": 11,
          "spinning_wild_mouse": 54, "classic_mini_rc": 4,
          "multi_dimension_rc_alt": 55, "flying_rc_alt": 57, "lay_down_rc_alt": 62}
HIDDEN = {56, 58, 64}
DUMMY = {29, 31, 34, 80, 82, 83, 84, 85, 89}


def revision(path):
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=path, text=True).strip()


def sources(data):
    value = data.get("sourceGame", [])
    return [value] if isinstance(value, str) else value


def list_value(value):
    return [value] if isinstance(value, str) else value


def write_csv(path, rows):
    with path.open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--objects", type=Path, required=True)
    parser.add_argument("--core", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if revision(args.objects) != OBJECTS_SHA or revision(args.core) != CORE_SHA:
        raise ValueError("Reference checkout revision differs from the retained evidence pin")
    args.output.mkdir(parents=True, exist_ok=True)
    descriptors = {}
    for file in sorted((args.core / "src/openrct2/ride/rtd").rglob("*.h")):
        text = file.read_text()
        matches = list(re.finditer(r"constexpr RideTypeDescriptor (\w+)", text))
        for index, symbol in enumerate(matches):
            block = text[symbol.end():matches[index + 1].start() if index + 1 < len(matches) else len(text)]
            name = re.search(r'\.Name\s*=\s*"([^"]+)"', block)
            if name:
                descriptors[symbol[1]] = (name[1], file, block)
    table = (args.core / "src/openrct2/ride/RideData.cpp").read_text()
    table = table.split("constexpr RideTypeDescriptor kRideTypeDescriptors", 1)[1].split("};", 1)[0]
    entries = re.findall(r"/\*\s*(RIDE_TYPE_\w+),?\s*\*/\s*(\w+)", table)
    token_slot = {}
    families = []
    descriptor_rows = []
    for slot, (enum, symbol) in enumerate(entries):
        if symbol not in descriptors:
            continue
        token, file, text = descriptors[symbol]
        token_slot[token] = SPLITS.get(token, slot)
        height = re.search(r"\.Heights\s*=\s*\{([^}]+)\}", text)
        height_fields = [x.strip() for x in height[1].split(",") if x.strip()] if height else []
        if len(height_fields) != 4:
            raise ValueError(f"Missing four-field height tuple for {token}")
        modes = re.search(r"\.rideModes\s*=\s*\{([^}]+)\}", text)
        descriptor_rows.append({
            "modern_descriptor_slot": slot, "reference_token": token,
            "canonical_original_slot": token_slot[token] if token_slot[token] <= 90 else "",
            "descriptor_kind": "hidden track state" if slot in HIDDEN else "modern split" if token in SPLITS else "original selectable" if slot <= 90 else "modern addition",
            "height_tuple_native_expressions": ";".join(height_fields),
            "operation_modes_reference": ";".join(re.findall(r"RideMode::(\w+)", modes[1])) if modes else "",
            "parameter_evidence": "reconstructed implementation; symbols preserved; original unresolved",
            "source_url": f"https://github.com/OpenRCT2/OpenRCT2/blob/{CORE_SHA}/{file.relative_to(args.core)}",
        })
        if slot > 90 or slot in HIDDEN or slot in DUMMY:
            continue
        category = re.search(r"\.Category\s*=\s*RideCategory::(\w+)", text)[1]
        mass = re.search(r"\.MaxMass\s*=\s*(\d+)", text)
        lift = re.search(r"\.LiftData\s*=\s*\{([^}]+)\}", text)
        start = re.search(r"\.StartTrackPiece\s*=\s*TrackElemType::(\w+)", text)
        modes = re.search(r"\.rideModes\s*=\s*\{([^}]+)\}", text)
        families.append({
            "original_type_slot": slot, "reference_token": token,
            "project_family_candidate": token.replace("_", "-"), "primary_category": category,
            "base_object_variants": 0,
            "height_tuple_native": ";".join(height_fields),
            "max_mass_native": mass[1] if mass else "",
            "lift_speed_native_min_max": ";".join(re.findall(r"\b\d+\b", lift[1])[-2:]) if lift else "",
            "start_piece_reference": start[1] if start else "",
            "operation_modes_reference": ";".join(re.findall(r"RideMode::(\w+)", modes[1])) if modes else "",
            "parameter_evidence": "reconstructed implementation; original comparison unresolved",
            "source_path": str(file.relative_to(args.core)),
            "source_url": f"https://github.com/OpenRCT2/OpenRCT2/blob/{CORE_SHA}/{file.relative_to(args.core)}",
        })
    base = []
    rides = []
    all_files = sorted((args.objects / "objects").rglob("*.json"))
    for file in all_files:
        raw = file.read_bytes()
        data = json.loads(raw)
        namespace = file.relative_to(args.objects).parts[1]
        membership = sources(data)
        original = data.get("originalId", "")
        flags = None
        if re.fullmatch(r"[0-9A-Fa-f]{8}\|.{8}\|[0-9A-Fa-f]{8}", original):
            flags = int(original.split("|")[0], 16)
        legacy = flags is not None and (flags & 15) <= 10 and not original.split("|")[1].startswith("#")
        evidence = "legacy identity metadata" if legacy else "source-marked reconstruction"
        if original and not legacy:
            evidence = "synthetic built-in identity"
        if data.get("id", "").endswith("_fix"):
            evidence = "replacement metadata; do not count twice"
        if data.get("id", "").endswith("tycoon_park"):
            evidence = "launch membership unresolved"
        if data.get("properties", {}).get("editorOnly"):
            evidence = "editor-only compatibility metadata"
        row = {
            "reference_id": data["id"], "namespace": namespace,
            "source_memberships": ";".join(membership), "object_type": data["objectType"],
            "original_id": original, "original_source_nibble": (flags >> 4) & 15 if flags is not None else "",
            "identity_evidence": evidence, "source_path": str(file.relative_to(args.objects)),
            "source_sha256": hashlib.sha256(raw).hexdigest(),
            "source_url": f"https://github.com/OpenRCT2/objects/blob/{OBJECTS_SHA}/{file.relative_to(args.objects)}",
        }
        if "rct2" in membership:
            base.append(row)
        if data["objectType"] != "ride" or namespace not in {"rct2", "rct2ww", "rct2tt", "official"}:
            continue
        props = data.get("properties", {})
        tokens = props.get("type", [])
        tokens = [tokens] if isinstance(tokens, str) else tokens
        slots = sorted({token_slot[t] for t in tokens if t in token_slot})
        cars = props.get("cars", [])
        cars = [cars] if isinstance(cars, dict) else cars
        rides.append({**row,
            "modern_type_tokens": ";".join(tokens), "original_type_slots": ";".join(map(str, slots)),
            "categories_reference": ";".join(list_value(props.get("category", []))),
            "clearance_native": props.get("clearance", ""), "min_cars": props.get("minCarsPerTrain", ""),
            "max_cars": props.get("maxCarsPerTrain", ""), "sold_products": ";".join(list_value(props.get("sells", []))),
            "car_component_seats": ";".join(str(c.get("numSeats", 0)) for c in cars),
            "car_component_mass_native": ";".join(str(c.get("mass", "")) for c in cars),
            "car_component_spacing_native": ";".join(str(c.get("spacing", "")) for c in cars),
            "empty_car_components": props.get("numEmptyCars", ""),
            "behavior_status": "not verified against original; not a production implementation registry",
            "asset_status": "original media excluded; independently authored asset pending",
        })
        if namespace == "rct2":
            for family in families:
                if family["original_type_slot"] in slots:
                    family["base_object_variants"] += 1
    write_csv(args.output / "base-content.csv", base)
    write_csv(args.output / "ride-variants.csv", rides)
    write_csv(args.output / "families.csv", families)
    write_csv(args.output / "descriptor-parameters.csv", descriptor_rows)
    products = []
    item_file = args.core / "src/openrct2/ride/ShopItem.cpp"
    for line in item_file.read_text().splitlines():
        name = re.search(r"/\* ShopItem::(\w+) \*/\s*\{", line)
        if not name:
            continue
        money = re.findall(r"(\d+\.\d+)_GBP", line)
        usage = re.search(r"Litter::Type::(\w+),\s*(0x[0-9A-Fa-f]+|\d+),\s*ShopItem::(\w+)", line)
        if len(money) != 5 or not usage:
            raise ValueError(f"Unrecognized item data row: {name[1]}")
        flags = re.findall(r"SHOP_ITEM_FLAG_(\w+)", line)
        kind = "container" if "IS_CONTAINER" in flags else "purchasable"
        if name[1] in {"voucher", "admission"}:
            kind = "non-product sentinel"
        values = [int(Decimal(x) * 10) for x in money]
        products.append({
            "reference_product": name[1],
            "object_product_token": "tshirt" if name[1] == "tShirt" else re.sub(r"([a-z])([A-Z])", r"\1_\2", name[1]).lower(),
            "record_kind": kind,
            "stock_cost_tenths": values[0], "value_normal_tenths": values[1],
            "value_hot_tenths": values[2], "value_cold_tenths": values[3],
            "default_price_tenths": values[4], "flags": ";".join(flags),
            "litter_type": usage[1], "consumption_native": int(usage[2], 0) if usage[2].startswith("0x") else int(usage[2]),
            "discard_container": usage[3],
            "evidence": "reconstructed implementation; original runtime unresolved",
            "source_url": f"https://github.com/OpenRCT2/OpenRCT2/blob/{CORE_SHA}/{item_file.relative_to(args.core)}",
        })
    write_csv(args.output / "products-reference.csv", products)
    summary = {
        "purpose": "Read-only research inventory; not shipped content, exact-original evidence, or asset redistribution permission",
        "objects_revision": OBJECTS_SHA, "core_revision": CORE_SHA,
        "scanned_json_records": len(all_files), "source_marked_rct2_records": len(base),
        "source_marked_rct2_object_types": dict(sorted(Counter(x["object_type"] for x in base).items())),
        "ride_namespace_counts": dict(sorted(Counter(x["namespace"] for x in rides).items())),
        "canonical_original_type_slots": len(families),
        "product_record_kinds": dict(sorted(Counter(x["record_kind"] for x in products).items())),
        "base_family_counts": dict(sorted(Counter(x["primary_category"] for x in families).items())),
        "base_variant_counts": dict(sorted(Counter({c: sum(x["base_object_variants"] for x in families if x["primary_category"] == c) for c in {x["primary_category"] for x in families}}).items())),
        "modern_type_to_original_slot": dict(sorted(token_slot.items())),
        "artifacts": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in args.output.glob("*.csv")},
    }
    (args.output / "catalogue-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({k:v for k,v in summary.items() if k not in {"modern_type_to_original_slot", "artifacts"}}, indent=2))


if __name__ == "__main__":
    main()
