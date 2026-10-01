#!/usr/bin/env bash
# Runs inside the emscripten/emsdk image; started by build.mjs, not meant to be run directly.
#
# Env:    OPENCV_TAG    OpenCV git tag to build
#         BUILDER_IMAGE image this runs in (part of the build cache key; not EMSDK_*, which the image clears)
# Args:   build_js.py options (after the build dir), passed through verbatim
# Mounts: /work  Docker volume, caches the OpenCV clone and build tree between runs
#         /cfg   scripts/build-opencv (read-only)
#         /out   host output folder; receives opencv.js and LICENSE
set -euo pipefail

: "${OPENCV_TAG:?OPENCV_TAG is required}"
: "${BUILDER_IMAGE:?BUILDER_IMAGE is required}"

SRC=/work/opencv
BUILD=/work/build
TAG_MARKER=/work/opencv.tag
BUILD_MARKER=/work/build.key

# Everything besides the sources that determines the build output
BUILD_KEY="$(printf '%s\n' "$BUILDER_IMAGE" "$@" | cat - /cfg/magnetic_outline.config.py /cfg/patch-cmake.sh | sha256sum | cut -d' ' -f1)"

# Reuse the cached clone only if it is the requested tag. Otherwise start clean,
# so a tag bump never silently rebuilds the old sources.
if [ -d "$SRC/.git" ] && [ "$(cat "$TAG_MARKER" 2>/dev/null)" = "$OPENCV_TAG" ]; then
  echo "Using cached OpenCV $OPENCV_TAG clone"
  git -C "$SRC" checkout -- modules/js/CMakeLists.txt
else
  echo "Cloning OpenCV $OPENCV_TAG"
  rm -rf "$SRC" "$BUILD" "$TAG_MARKER" "$BUILD_MARKER"
  git clone --branch "$OPENCV_TAG" --depth 1 https://github.com/opencv/opencv.git "$SRC"
  echo "$OPENCV_TAG" > "$TAG_MARKER"
fi

# Reuse the build tree only if it was built with the same image, options,
# whitelist and patches. Otherwise stale objects or CMake cache entries could
# end up in a binary that BUILD-INFO.json doesn't describe.
if [ -d "$BUILD" ] && [ "$(cat "$BUILD_MARKER" 2>/dev/null)" != "$BUILD_KEY" ]; then
  echo "Build settings changed; starting with a clean build tree"
  rm -rf "$BUILD" "$BUILD_MARKER"
fi

bash /cfg/patch-cmake.sh "$SRC/modules/js/CMakeLists.txt"

cd "$SRC"
emcmake python3 ./platforms/js/build_js.py "$BUILD" "$@"
echo "$BUILD_KEY" > "$BUILD_MARKER"

# The raw EXPORT_ES6 module, not the UMD-wrapped bin/opencv.js
cp "$BUILD/bin/opencv_js.js" /out/opencv.js
cp "$SRC/LICENSE" /out/LICENSE

echo "build-in-container.sh: done"
