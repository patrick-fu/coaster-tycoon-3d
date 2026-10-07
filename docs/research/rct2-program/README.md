# Complete-content research checkpoint

Retained on 2026-10-07 after seven independent GPT 6.1 Sol Max investigations
and Antigravity visual planning. Patrick rejected the previous art checkpoint;
the earlier narrow simulation checks remain evidence for their measured scope.
This programme expands content variety and simulation depth together.

## Evidence and reproducibility

- Object metadata: [OpenRCT2/objects at 978f596](https://github.com/OpenRCT2/objects/tree/978f596972c1163dc670d853dd6add4766f10dbd).
- Reconstructed behavior: [OpenRCT2 at 1151322](https://github.com/OpenRCT2/OpenRCT2/tree/11513222890717e81431c83a28aafb7555f2ccd2).
- Original qualitative rules: [publisher-hosted RCT2 manual](https://cdn.akamai.steamstatic.com/steam/apps/285330/manuals/manual.pdf).
- Integration baseline: project main 37ee9a8, runtime art checkpoint a7d6451.

Use the evidence classes from [the programme](../../planning/rct2-program.md).
The reconstructed implementation contains deliberate modern changes and known
guesses. Its numbers are comparison seeds, never proof of original parity.
No original executable or owned original scenario/object files were inspected.

[audit-catalogue.py](audit-catalogue.py) independently reads pinned reference
metadata and descriptor data without importing upstream implementation. Run it
against read-only reference checkouts, with output in a disposable directory,
and compare its CSV hashes with [catalogue-summary.json](catalogue-summary.json).
It is a documentation-data audit, not a production game test or data loader.
Do not feed its reference rows directly into the MIT simulation.

## The complete target inventory

The 155 base ride-object variants occupy 79 original selectable type slots:

| Primary category | Original type slots | Base object variants |
|---|---:|---:|
| Coasters | 33 | 56 |
| Transport | 5 | 11 |
| Water | 7 | 12 |
| Gentle | 16 | 23 |
| Thrill | 11 | 12 |
| Shops and services | 7 | 41 |
| Total | 79 | 155 |

[families.csv](families.csv) lists every slot and its native-height tuple,
mass cap, lift-speed range, starting construction piece and reconstructed
operating modes. [ride-variants.csv](ride-variants.csv) lists all 155 base,
56 Wacky Worlds, 56 Time Twister and five official modern ride-object records,
including original identity, products, component seats/mass/spacing and source
hash. Multiple car components are not independent vehicles or additive seats.
Height tuple fields retain symbolic expressions rather than dropping unresolved
constants. [descriptor-parameters.csv](descriptor-parameters.csv) preserves
the separate modern split/alternate descriptors too; a canonical type count does
not erase their distinct behavior. Object clearances can override family defaults.
The item table has 39 purchasable records, ten containers and two non-product
voucher/admission sentinels, with an explicit product-token crosswalk.

The 507 base scenery records comprise 333 small objects, 48 large objects and
126 walls. Buildings are compositions of these, roofs, stations, entrances and
facilities; do not invent an additional disjoint building denominator. The 29
scenery groups cover these objects, but some also reference non-base children.
Every child needs its own membership check. There are 18 path-item variants:
five benches, four bins, six lamps, two jumping-fountain/snow objects and one
queue television. Nine banners and three park entrances are separate targets.

## Count traps

[base-content.csv](base-content.csv) contains **857 source-marked records**, not
857 original buildable objects. The raw population includes music, animations,
audio, climates, synthetic styles and decomposed compatibility data. It includes
an editor-only RCT1-directory Road surface with both source memberships. Earlier
research's 645 non-ride subset was directory-scoped: 702 source-marked non-rides
minus 56 media/climate/name records minus that Road record. It is not a vanilla
content denominator. The corrected filter and per-row evidence are retained.

Other distinctions:

- Modern Hypercoaster, Hyper Twister, Monster Trucks and Spinning Wild Mouse
  descriptors fold into original slots 19, 51, 11 and 54. Classic Mini folds
  into slot 4 but has no base object at this pin. Alternate inverted track states
  and dummy slots are not extra selectable families.
- Water Coaster is primarily a coaster and also a water filter match. Count it
  once. River Rafts' UI category does not prove transport destination behavior.
- Wacky Worlds and Time Twister add variants of existing base families. The
  five official modern objects are outside the original baseline, including an
  official panda object despite its `rct2dlc` prefix.
- Original-ID presence alone is insufficient: 58 populated tuples are synthetic
  built-ins. Source nibble 8 excludes none of those. The 751 legacy-type identity
  records omit decomposed paths/styles and include scenario metadata; that is
  also not the complete original-content denominator.
- Modern 12 path surfaces plus six railing records are not 18 original paths;
  eight legacy path definitions require crosswalks. Six water metadata records
  represent four original identities plus two replacements. Twenty-seven
  scenario metadata records are not proof of 27 launch scenarios.
- Shared RCT1 membership does not exclude a genuine RCT2 base object. Missing
  original IDs do not prove an underlying built-in feature was absent originally.

## Retained specifications

- [Construction, ride physics and operation](rides.md)
- [Products, services, guests and staff](commerce-and-guests.md)
- [Admission, finance, calendar and scenarios](finance-and-scenarios.md)
- [Editable assets and representative model briefs](../../planning/model-pipeline.md)
- [Classic frontend](../../planning/classic-content-ui.md)
- [Coverage gaps and discriminating acceptance cases](../../planning/fidelity-gaps.md)
- [Implementation order and ownership](../../planning/rct2-program.md)

## Source and asset permissions

Reference inventories attribute the object metadata repository, which declares
CC BY 4.0 in its [LICENCE](https://github.com/OpenRCT2/objects/blob/978f596972c1163dc670d853dd6add4766f10dbd/LICENCE).
The CSVs select and classify factual metadata; they omit original images,
localized prose, sprite loading paths and complete JSON objects. Retain that
attribution and the per-row source link when adapting the inventories.
This metadata licence is not blanket permission to ship original commercial
artwork. The core reference is GPL; no source implementation is imported or
linked. The independent project remains MIT, with separate asset notices.

Downloaded publisher screenshots/manual stay in the external observation corpus.
The acquired CC0 material candidates have actual hashes and download evidence;
they still need visual approval, UV authoring and remote export validation.
