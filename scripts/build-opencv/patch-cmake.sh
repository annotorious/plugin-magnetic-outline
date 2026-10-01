#!/usr/bin/env bash
# Patches the hardcoded Emscripten link flags in opencv/modules/js/CMakeLists.txt.
# They are appended after our own flags, so they can't be overridden from build_js.py.
# Fails if any patch did not apply (e.g. after an OpenCV upgrade changed the file).
#
# Usage: patch-cmake.sh <path/to/modules/js/CMakeLists.txt>
set -euo pipefail

CMAKE="${1:?usage: patch-cmake.sh <path/to/modules/js/CMakeLists.txt>}"

# Filesystem support is not needed (no file I/O), and preload plugins need it
sed -i 's/ -s FORCE_FILESYSTEM=1 --use-preload-plugins//' "$CMAKE"

# Same heap as the previous build, under the current setting names
sed -i 's/-s TOTAL_MEMORY=128MB -s WASM_MEM_MAX=1GB/-s INITIAL_MEMORY=128MB -s MAXIMUM_MEMORY=1GB/' "$CMAKE"

# Deprecated in current Emscripten
sed -i 's/ -s DEMANGLE_SUPPORT=1//' "$CMAKE"

for flag in FORCE_FILESYSTEM use-preload-plugins TOTAL_MEMORY WASM_MEM_MAX DEMANGLE_SUPPORT; do
  if grep -q -- "$flag" "$CMAKE"; then
    echo "ERROR: patch-cmake.sh: '$flag' is still in $CMAKE. Update the sed patterns." >&2
    exit 1
  fi
done

if ! grep -q -- "-s INITIAL_MEMORY=128MB -s MAXIMUM_MEMORY=1GB" "$CMAKE"; then
  echo "ERROR: patch-cmake.sh: memory flags were not found in $CMAKE. Update the sed patterns." >&2
  exit 1
fi

echo "patch-cmake.sh: patched $CMAKE"
