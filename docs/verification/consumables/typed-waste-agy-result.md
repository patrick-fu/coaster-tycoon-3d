# Visual Repair Result: Typed Consumable Waste Vertical Placement

## 1. Exact Code Changes

File written: `implementation/consumable-waste.js` (copied from `input/consumable-waste.js` with targeted adjustments).

Only the two typed-instance vertical placements within `createConsumableWaste.update()` were modified:

### Line-by-Line Diff

```diff
       if (containerId === 'emptyCan') {
-        transform.position.set(x + 2, y + 0.01, z + 2);
+        // +0.14m public deck top + 0.002m presentation clearance against z-fighting
+        transform.position.set(x + 2, y + 0.142, z + 2);
         transform.scale.set(1, 1, 1);
         transform.rotation.set(0, (id % 8) * 0.785, 0);
         transform.updateMatrix();
         canMesh.setMatrixAt(canCount++, transform.matrix);
       } else if (containerId === 'emptyBurgerBox') {
-        transform.position.set(x + 2, y + 0.01, z + 2);
+        transform.position.set(x + 2, y + 0.142, z + 2);
         transform.scale.set(1, 1, 1);
         transform.rotation.set(0, (id % 7) * 0.9, 0);
         transform.updateMatrix();
         boxMesh.setMatrixAt(boxCount++, transform.matrix);
```

### Offset Derivation
- Reference source (`input/path-deck-source.txt`, lines 1150–1151) defines the public path deck geometry:
  ```javascript
  boxMesh(ctx, parent, deckMat, x, h + 0.07, z, 3.86, 0.14, 3.86);
  ```
- The deck box has a center height at `h + 0.07` and thickness `0.14`, placing the opaque public deck top surface at `h + 0.07 + (0.14 / 2) = h + 0.14` (e.g., `4.1400001719594` for native `h = 4`).
- With the previous placement at `y + 0.01`, the burger box base was buried ~35.9865mm below the deck surface, and the metal can top surface produced coplanar floating-point contention with the deck top.
- The updated vertical placement uses `y + 0.142` (`+0.14m` deck top surface + `0.002m` finite presentation clearance), elevating both typed geometries just above the deck top and preventing z-fighting artifacts.

---

## 2. Preserved Boundaries

- **Legacy Wrapper Branch**: The fallback `else` branch for generic legacy litter remains byte-for-byte identical:
  ```javascript
      } else {
        // Generic legacy litter wrapper: exact original form, position, and scale
        transform.position.set(x + 2, y + 0.04, z + 2);
        transform.scale.set(0.2, 0.035, 0.15);
        transform.rotation.set(0, id % 5, 0);
        transform.updateMatrix();
        genericLitterMesh.setMatrixAt(genericCount++, transform.matrix);
      }
  ```
- **Geometry & Mesh Attributes**:
  - `buildCanGeometry()` and `buildBurgerBoxGeometry()` are completely unchanged.
  - Scale transforms (`1, 1, 1`), horizontal centerings (`x + 2, z + 2`), and rotation formulas (`(id % 8) * 0.785` and `(id % 7) * 0.9`) remain exact.
  - Material configurations (`canMaterial`, `boxMaterial`), shadow settings (`castShadow`, `receiveShadow`), and geometry buffer mergers remain untouched.
- **Protocol & Logic**:
  - Packet stride (`i += 4`), litter ID extraction, and type mapping via `packet.litterTypes` remain identical.
  - Instance count tracking, `instanceMatrix.needsUpdate = true`, bounding sphere resets, and disposal teardown functions (`dispose()`) are unchanged.
- **Scope Isolation**:
  - No edits to `environment.js`, simulation rules, authority positions, guest behaviors, sprite assets, or versioning.
  - No external packages, dependencies, or test harnesses added.
  - The 2mm clearance is applied solely as a presentation-level tolerance for z-fighting prevention without asserting physical calibration.

---

## 3. Unexecuted Runtime Checks

Per instructions ("No terminal/build/test/simulation/Blender/browser/image processing, no other agents/git/GitHub, no edits outside the two output files. Mac only text authoring"):
- No terminal execution, AST parsing tool, build verification, or automated unit tests were executed in this workspace.
- No headless browser, WebGL rendering context, or screenshot comparison was executed.
- Runtime verification on the frozen Grok software-Chrome P2 real-player checkpoint—including visible pixel rasterization, deck surface collision inspection, and memory/resource profiling—remains unexecuted locally and is reserved for Root inspection.
