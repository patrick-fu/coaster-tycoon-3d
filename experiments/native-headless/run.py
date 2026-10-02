"""Disposable native baseline; all generated output goes to --scratch."""
import argparse
import json
import pathlib
import platform
import shlex
import shutil
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--core", required=True, type=pathlib.Path)
parser.add_argument("--json-source", required=True, type=pathlib.Path)
parser.add_argument("--scratch", required=True, type=pathlib.Path)
args = parser.parse_args()
core, headers, scratch = (p.resolve() for p in (args.core, args.json_source, args.scratch))
here = pathlib.Path(__file__).resolve().parent
scratch.mkdir(parents=True, exist_ok=True)


def run(command, name, cwd=None):
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True)
    (scratch / (name + ".log")).write_text(result.stdout + result.stderr)
    if result.returncode:
        print((result.stdout + result.stderr)[-5000:])
        raise SystemExit(f"{name} failed with exit {result.returncode}")
    return result.stdout


pins = {
    core: "11513222890717e81431c83a28aafb7555f2ccd2",
    headers: "9cca280a4d0ccf0c08f47a99aa71d1b0e52f8d03",
}
for source, pin in pins.items():
    actual = subprocess.check_output(["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
    if actual != pin:
        raise SystemExit(f"Unexpected source pin: {source}")

configuration = {
    "CMAKE_BUILD_TYPE": "Release",
    "MACOS_USE_DEPENDENCIES": "OFF",
    "DISABLE_GUI": "ON",
    "DISABLE_NETWORK": "ON",
    "DISABLE_HTTP": "ON",
    "DISABLE_TTF": "OFF" if platform.system() == "Darwin" else "ON",
    "DISABLE_DISCORD_RPC": "ON",
    "DISABLE_FLAC": "ON",
    "DISABLE_VORBIS": "ON",
    "DISABLE_OPENGL": "ON",
    "DISABLE_VERSION_CHECKER": "ON",
    "ENABLE_SCRIPTING": "OFF",
    "WITH_TESTS": "OFF",
    "OPENRCT2_USE_CCACHE": "OFF",
    "DOWNLOAD_TITLE_SEQUENCES": "OFF",
    "DOWNLOAD_OBJECTS": "OFF",
    "DOWNLOAD_OPENSFX": "OFF",
    "DOWNLOAD_OPENMUSIC": "OFF",
    "CMAKE_INTERPROCEDURAL_OPTIMIZATION_RELEASE": "OFF",
    "CMAKE_CXX_FLAGS": f"-isystem {shlex.quote(str(headers / 'include'))}",
    "CMAKE_PROJECT_INCLUDE": str(here / "attach.cmake"),
}
configure = ["cmake", "-S", str(core), "-B", str(scratch / "build"), "-G", "Ninja"]
configure += [f"-D{k}={v}" for k, v in configuration.items()]
(scratch / "configure-command.json").write_text(json.dumps(configure, indent=2) + "\n")
run(configure, "configure")
run(["cmake", "--build", str(scratch / "build"), "--target", "openrct2-cli", "native-headless-baseline", "--parallel", "6"], "build")
run([str(scratch / "build/openrct2-cli"), "--version"], "cli-version")

results = []
for repetition in range(2):
    runtime = scratch / f"runtime-{repetition}"
    if runtime.exists():
        raise SystemExit(f"A fresh runtime directory is required: {runtime}")
    language_dir = runtime / "base-2/language"
    language_dir.mkdir(parents=True)
    shutil.copy2(core / "data/language/en-GB.txt", language_dir / "en-GB.txt")
    output = run([str(scratch / "build/native-headless-baseline"), str(runtime)], f"run-{repetition}")
    checkpoints = [json.loads(line) for line in output.splitlines() if line.startswith('{"checkpoint":')]
    if len(checkpoints) != 5:
        raise SystemExit("Incomplete checkpoint output")
    results.append(checkpoints)
if results[0] != results[1]:
    raise SystemExit("Selected checkpoint fields differ across fresh processes")
(scratch / "checkpoints.json").write_text(json.dumps(results, indent=2) + "\n")
print(json.dumps({"exit": 0, "freshProcesses": 2, "ticksPerProcess": 16384, "selectedCheckpointsEqual": True, "final": results[0][-1]}, indent=2))
