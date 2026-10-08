# Routed carrier revision

The initial finite hardware export was rejected by the actual c75 run. All
59 saved poses passed their numerical wheel/contact/link checks, but the new
centre carriers intersected the unchanged bogie carrier plates. Original mesh
POSITION and NORMAL data were unchanged; Blender re-export changed TEXCOORD_0
bindings. Neither the collision failures nor UV changes are accepted.

Keep the original authoring contract and rejected source/input snapshots. The
new AGY carrier attaches to both original longitudinal stringer end faces at
Blender X ±0.46, Y ±1.25, Z 0.22 and converges to the unchanged clevis back
face at Y ±1.30. The actual flat attachment patches are 0.032 m wide and
0.028 m high. Clevis, pin, coupler, seat, wheel, body and frozen pose dimensions
remain unchanged. All new carrier material stays outside the stringer ends;
offline exact union welds only the new carrier, clevis and pin geometry.

In glTF coordinates, each proposed chassis contact is at X ±0.46, Y 0.22,
Z ±1.25. The front mount outward normal is −Z and its stringer face normal is
+Z; rear normals are reversed. Original chassis components 0 and 1 are the
left and right stringers. Each finite circular contact patch has radius
0.023 m, containing the actual 0.032 × 0.028 m flat carrier face. These are
proposed measured mating contacts, not blanket collision exemptions. The
validator must observe each contact in every retained pose.

Append composition preserves every original accessor payload, bufferView,
material, embedded image, sampler, node frame and retained triangle binding.
Only the chassis primitive's active indices remove exactly the frozen two old
hitch solids: 216 of 972 triangles. Old bytes remain in the original BIN
prefix, including the now-unused old chassis indices. Append the actual routed
mount geometry and filtered indices without re-exporting the original car.

Root owns artist adapters and hashed metadata. The composition agent owns its
isolated assembler/proof. The native validator owner owns its checker,
contract and execution evidence. Independent reviewers are read only. Run all
exports, numerical checks, model inspection and browser checks on Grok Bot.
Keep the original c75 rejection and the revised run separate. Qualification is
limited to the exact exported finite geometry and 59 saved flat poses; original,
native construction, grades, continuous swept motion, loads, production ride
integration, representative GPU and human visual acceptance remain open.
