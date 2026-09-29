#!/usr/bin/env node
// Builds the minimal OpenCV.js in Docker, verifies it with smoke-test.mjs and
// copies it to vendor/opencv/. See README.md in this folder.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const OPENCV_TAG = '4.12.0';
const EMSDK_IMAGE = 'emscripten/emsdk:3.1.74';

// Caches the OpenCV clone and build tree between runs (~425 MB)
const VOLUME = 'magnetic-outline-opencv-build';

// build_js.py options, passed verbatim and recorded in BUILD-INFO.json.
// The CMAKE_*_FLAGS_RELEASE overrides are required: otherwise CMake's Release
// -O3 is appended after -Oz and wins (1.82 MB instead of 1.32 MB).
const BUILD_JS_ARGS = [
  '--build_wasm',
  '--config', '/cfg/magnetic_outline.config.py',
  '--cmake_option=-DBUILD_LIST=core,imgproc,js',
  '--cmake_option=-DBUILD_TESTS=OFF',
  '--cmake_option=-DBUILD_PERF_TESTS=OFF',
  '--cmake_option=-DBUILD_EXAMPLES=OFF',
  "--cmake_option=-DCMAKE_CXX_FLAGS_RELEASE='-Oz -DNDEBUG'",
  "--cmake_option=-DCMAKE_C_FLAGS_RELEASE='-Oz -DNDEBUG'",
  '--build_flags=-Oz -s EXPORT_ES6=1 -s ENVIRONMENT=web,worker,node'
];

const HERE = dirname(fileURLToPath(import.meta.url));
const VENDOR = resolve(HERE, '../../vendor/opencv');

const sha256 = buf => createHash('sha256').update(buf).digest('hex');

const run = (cmd, args) =>
  spawnSync(cmd, args, { stdio: 'inherit' }).status;

const build = out => {
  if (spawnSync('docker', ['version'], { stdio: 'ignore' }).status !== 0)
    throw new Error('Docker is not available. Install Docker and make sure it is running.');

  console.log(`Building OpenCV ${OPENCV_TAG} with ${EMSDK_IMAGE} (the first run clones OpenCV and takes several minutes)`);

  const status = run('docker', [
    'run', '--rm',
    '-v', `${VOLUME}:/work`,
    '-v', `${HERE}:/cfg:ro`,
    '-v', `${out}:/out`,
    '-e', `OPENCV_TAG=${OPENCV_TAG}`,
    EMSDK_IMAGE,
    'bash', '/cfg/build-in-container.sh',
    ...BUILD_JS_ARGS
  ]);

  if (status !== 0)
    throw new Error(`container build exited with code ${status}; see the output above.`);

  const built = join(out, 'opencv.js');

  // Verify before touching vendor/
  if (run(process.execPath, [join(HERE, 'smoke-test.mjs'), built]) !== 0)
    throw new Error('smoke test failed; vendor/opencv/ was left unchanged.');

  mkdirSync(VENDOR, { recursive: true });
  copyFileSync(built, join(VENDOR, 'opencv.js'));
  copyFileSync(join(out, 'LICENSE'), join(VENDOR, 'LICENSE'));

  const js = readFileSync(built);

  const info = {
    opencvTag: OPENCV_TAG,
    emsdkImage: EMSDK_IMAGE,
    buildJsArgs: BUILD_JS_ARGS,
    whitelistSha256: sha256(readFileSync(join(HERE, 'magnetic_outline.config.py'))),
    opencvJs: { bytes: js.length, sha256: sha256(js) },
    builtAt: new Date().toISOString()
  };

  writeFileSync(join(VENDOR, 'BUILD-INFO.json'), JSON.stringify(info, null, 2) + '\n');

  console.log(`\nvendor/opencv/opencv.js: ${js.length} bytes (gzip ${gzipSync(js, { level: 9 }).length})`);
  console.log('Review and commit vendor/opencv/.');
}

const out = mkdtempSync(join(tmpdir(), 'opencv-build-'));

try {
  build(out);
} catch (e) {
  console.error(`\nbuild:opencv failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
