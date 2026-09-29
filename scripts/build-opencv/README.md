# Custom OpenCV.js build

The plugin uses a minimal OpenCV.js containing only the functions it needs
(core + parts of imgproc), about 1.3 MB instead of about 11 MB for the full build. The
build output is committed to `vendor/opencv/`, so you only need this folder
when changing the OpenCV build itself.

## Prerequisites

- Docker (Docker Desktop on Windows/macOS). Nothing else: Emscripten and
  OpenCV are pulled into the container.

## Rebuild

```sh
npm run build:opencv
```

This:

1. builds OpenCV `OPENCV_TAG` in the `EMSDK_IMAGE` container (both pinned at the top of
   `build.mjs`). The OpenCV clone and build tree are cached in the Docker volume
   `magnetic-outline-opencv-build`, so the first run takes several minutes and later runs are faster;
2. runs `smoke-test.mjs` on the result. On failure, `vendor/opencv/` is left unchanged;
3. copies `opencv.js` and OpenCV's `LICENSE` to `vendor/opencv/` and writes
   `BUILD-INFO.json` (versions, build options, hashes).

Then review and commit `vendor/opencv/`.

`npm run test:opencv` runs the smoke test against the committed build.

## Exposing another OpenCV function

1. Add it to `magnetic_outline.config.py` (same format as OpenCV's
   `platforms/js/opencv_js.config.py`).
2. Add its types to `vendor/opencv/opencv.d.ts`.
3. Add it to the `API` list in `smoke-test.mjs` (and a behaviour check if it matters).
4. `npm run build:opencv`, check the new size, commit.

## Upgrading OpenCV or Emscripten

Change `OPENCV_TAG` / `EMSDK_IMAGE` in `build.mjs` and rebuild. A tag change
re-clones automatically. If upstream changed `modules/js/CMakeLists.txt`,
`patch-cmake.sh` fails on purpose. Update its `sed` patterns.

## Gotchas

- **`-Oz` needs the Release flags overridden.** `build_js.py` puts
  `--build_flags` into `CMAKE_C(XX)_FLAGS`, but CMake appends the Release
  flags (`-O3`) after them. Hence the `CMAKE_*_FLAGS_RELEASE` options.
- **Some link flags are hardcoded** in `modules/js/CMakeLists.txt` and come
  after ours. `patch-cmake.sh` edits them: no filesystem support, current
  memory setting names, no deprecated `DEMANGLE_SUPPORT`.
- **Use `bin/opencv_js.js`, not `bin/opencv.js`.** The latter is wrapped by
  `make_umd.py`, which breaks with `EXPORT_ES6`.
- **The factory returns a Promise.** `src/util/opencv.ts` adapts it to the
  `cv` object API (`cv.Mat` appears, then `cv.onRuntimeInitialized` fires)
  that the plugin code expects.
- **`ENVIRONMENT` includes `node`** only so the smoke test can run in Node
  (about 2 KB). Vite warns that `"module"` was externalized for browser compatibility.
  This is expected; that code path never runs in a browser.
- **Windows:** the build runs in a Docker volume, not a bind mount, because
  cloning OpenCV onto NTFS fails on long paths and is slow.

## Cleanup

```sh
docker volume rm magnetic-outline-opencv-build
```
