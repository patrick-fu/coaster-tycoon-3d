# Classic surface material recipes

Run only on Grok Bot. Patrick's Mac edits and retains sources/evidence.

`prepare-surfaces.py` requires Pillow and the two exact acquired ZIP bundles
and `material-inputs.json` under a sibling `sources/` directory. It verifies
each bundle and selected member before decoding, then writes exactly six PNGs
and a manifest to `prepared/`. It never executes provider Blender/script files.
The frozen provider files remain in the external material corpus.

`capture.py` uses the existing remote Chrome binary, default Linux profile and
WebSocket verification environment. It guards against existing profile pages,
compares the actual published baseline with the candidate web build, and owns
and closes its browser/server. Its retained `/workspace/coaster-surface-materials`
paths identify this experiment; update them for a different isolated run.
It reads the actual candidate loader's `Response.clone()` bytes rather than
assuming a served PNG equals the image loaded by the renderer. It also checks
the frozen save, static geometry/instances, live bindings/shaders and resource
failure/cancellation/disposal. These probes do not qualify real-GPU performance
or human visual acceptance.

Build output and shared dependencies remain remote. Full execution records and
retained source identities are linked from
[the experiment](../../docs/experiments/classic-surfaces/README.md).
