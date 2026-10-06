# Station access and candidate train simulation

This extends the production kernel under the [integrated simulation task](https://github.com/patrick-fu/coaster-tycoon-3d/issues/19). It is an implementation candidate for comparison, not a first-playable or original-physics pass.

## Operating and access authority

Station pieces form contiguous platform groups, including a group crossing the closed circuit's origin. Portals reference a stable station piece and face its side at platform height. Each group has at most one entrance and one exit. Ownership, terrain, supports, clearance, record capacity and explicit portal prices/refunds use the same atomic construction authority.

Testing/opening requires a closed circuit, at least one entrance and exit across the ride, a portal on each station group, and a configured train that fits its platform. Guest reachability is separately queried from a public path: an entrance requires a queue belonging to this ride and an exit requires public path access. Disconnected paths alter access immediately without pretending to prohibit an otherwise legal operating status. This separation follows reconstructed presence-versus-reachability evidence; exact original placement and portal rules remain unqualified.

Active rides reject geometry edits. Closing a travelling train stops new dispatch but permits its current cycle to reach unloading and then wait. A closed waiting or stalled **empty** train can be reset; passenger evacuation must be integrated before this operation is exposed for occupied trains. Removing geometry discards the inactive train and its old measurements. Shared car identities are stable, capacity counted and never mistaken for guest capacity.

## Independently authored motion

Profiles explicitly provide sampled centerlines, lift-chain/brake metadata and motion parameters. Samples join the piece's discrete connectors. Motion uses a derived course and transported orientation frames, integer millimetres of travel, speed in millimetres per tick, gravity in millimetres per second squared, and forces in thousandths of G. `tileMetres`, tick rate, train length and calibration are explicit profile data.

The candidate includes gravity, rolling/drag resistance, station drive, lift chains, braking, train-length slope averaging, waiting, travel, unloading and stalled states. Measurements record actual travelled distance, duration, maximum speed and vertical/lateral forces. Higher speed changes the actual cycle and curve forces; it does not merely change a displayed score. Rendering can query per-car course poses without owning motion rules.

One train per ride is currently implemented. Multiple-train block allocation, passenger mass/boarding, station choice across multiple platforms, breakdown/repair, complete motion calibration and original excitement/intensity/nausea formulas remain outstanding. No arbitrary rating score is substituted for those missing formulas. Centerline-versus-clearance coverage and transported-frame orientation need qualification with the independently authored selected-family catalogue; test fixtures are not a shipping coaster catalogue.

## State and verification boundary

Version 2 adds portals, operating/car settings, stable shared car IDs, train phase/travel/wait, lap statistics and measured results. Loading validates platform references, operating prerequisites, train fit, car uniqueness, travel/phase consistency and measurements before replacing the live world. Version 1 kernel saves are explicitly incompatible; the project has not shipped a production save format yet.

Paused state suppresses train updates. Equivalent ordered commands/ticks continue the same saved simulation across different batch sizes. Test rules and centerlines remain `project-candidate`, with no claim of vanilla constants, forces, timing or ratings. Compilation and integration tests run only on the designated Linux host. Independent review is required before this extension is integrated.
