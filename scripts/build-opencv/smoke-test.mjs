#!/usr/bin/env node
// Verifies that a built OpenCV.js provides everything the plugin uses and
// behaves like the previous @techstark/opencv-js build.
//
// Usage: node scripts/build-opencv/smoke-test.mjs [path/to/opencv.js]
// Default path: vendor/opencv/opencv.js
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Fails the test if opencv.js grows past this. Raise deliberately, never silently.
const SIZE_BUDGET_BYTES = Number(process.env.OPENCV_SIZE_BUDGET ?? 1_572_864); // 1.5 MB

const LOAD_TIMEOUT_MS = 30_000;

// Every OpenCV symbol the plugin uses. Keep in sync with
// magnetic_outline.config.py and vendor/opencv/opencv.d.ts.
const API = [
  'Mat',
  'Point',
  'cvtColor',
  'goodFeaturesToTrack',
  'segmentation_IntelligentScissorsMB',
  'COLOR_BGR2GRAY',
  'COLOR_RGBA2GRAY',
  'imread',
  'matFromImageData',
  'exceptionFromPtr'
];

const SCISSORS_METHODS = [
  'setEdgeFeatureCannyParameters',
  'setGradientMagnitudeMaxLimit',
  'applyImage',
  'buildMap',
  'getContour',
  'delete'
];

const fail = msg => {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
};

const check = (condition, msg) => {
  if (!condition) fail(msg);
};

const file = resolve(process.argv[2] ?? resolve(ROOT, 'vendor/opencv/opencv.js'));

let size;
try {
  size = statSync(file).size;
} catch {
  fail(`file not found: ${file}`);
}

// 1. Load
let factory;
try {
  ({ default: factory } = await import(pathToFileURL(file).href));
} catch (e) {
  fail(`cannot import ${file}: ${e.message}`);
}

check(typeof factory === 'function',
  'default export is not a factory function (expected an EXPORT_ES6 MODULARIZE build, not the UMD opencv.js)');

let timer;
const timeout = new Promise((_, reject) => {
  timer = setTimeout(() => reject(new Error(`not ready after ${LOAD_TIMEOUT_MS} ms`)), LOAD_TIMEOUT_MS);
});

let cv;
try {
  cv = await Promise.race([factory(), timeout]);
} catch (e) {
  fail(`runtime initialisation failed: ${e.message}`);
} finally {
  clearTimeout(timer);
}

// 2. API surface
for (const name of API)
  check(cv[name] !== undefined, `missing cv.${name}`);

for (const method of SCISSORS_METHODS)
  check(typeof cv.segmentation_IntelligentScissorsMB.prototype[method] === 'function',
    `missing cv.segmentation_IntelligentScissorsMB.prototype.${method}`);

// 3. Behaviour: 200x150 RGBA image, white rectangle x 50..149, y 40..109 on black
const W = 200, H = 150;
const data = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const on = x >= 50 && x < 150 && y >= 40 && y < 110;
    data[i] = data[i + 1] = data[i + 2] = on ? 255 : 0;
    data[i + 3] = 255;
  }
}

const imageData = { width: W, height: H, data };

// 3a. Keypoints: same calls as src/util/get-keypoints-worker.ts
{
  const mat = cv.matFromImageData(imageData);
  cv.cvtColor(mat, mat, cv.COLOR_BGR2GRAY);

  const corners = new cv.Mat();
  const none = new cv.Mat();
  cv.goodFeaturesToTrack(mat, corners, 500000, 0.001, 2, none, 5, false, 0.04);

  const found = [];
  for (let i = 0; i < corners.rows; i++)
    found.push(`${Math.round(corners.data32F[i * 2])},${Math.round(corners.data32F[i * 2 + 1])}`);

  corners.delete();
  none.delete();
  mat.delete();

  const expected = ['148,108', '51,108', '148,41', '51,41'];
  check(JSON.stringify([...found].sort()) === JSON.stringify([...expected].sort()),
    `goodFeaturesToTrack: expected corners ${expected.join(' ')}, got ${found.join(' ') || '(none)'}`);
}

// 3b. Intelligent scissors: same calls as src/openseadragon/intelligent-scissors.svelte
{
  const src = cv.matFromImageData(imageData);
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);

  const tool = new cv.segmentation_IntelligentScissorsMB();
  tool.setEdgeFeatureCannyParameters(32, 100);
  tool.setGradientMagnitudeMaxLimit(200);
  tool.applyImage(src);
  tool.buildMap(new cv.Point(50, 40));

  const contour = new cv.Mat();
  tool.getContour(new cv.Point(149, 109), contour);

  const points = [];
  for (let i = 0; i < contour.rows; i++)
    points.push([contour.data32S[i * 2], contour.data32S[i * 2 + 1]]);

  contour.delete();
  tool.delete();
  src.delete();

  const summary = JSON.stringify({
    count: points.length,
    first: points[0],
    middle: points[points.length >> 1],
    last: points[points.length - 1]
  });

  const expected = JSON.stringify({ count: 169, first: [50, 40], middle: [134, 39], last: [149, 109] });

  check(summary === expected, `getContour: expected ${expected}, got ${summary}`);
}

// 4. Errors surface as exception pointers that exceptionFromPtr can decode
{
  let thrown;
  const a = new cv.Mat();
  const b = new cv.Mat();

  try {
    cv.cvtColor(a, b, cv.COLOR_RGBA2GRAY);
  } catch (e) {
    thrown = e;
  } finally {
    a.delete();
    b.delete();
  }

  check(typeof thrown === 'number', `expected a numeric exception pointer, got ${typeof thrown}`);

  const msg = cv.exceptionFromPtr(thrown).msg;
  check(/Assertion failed/.test(msg), `exceptionFromPtr: unexpected message: ${msg}`);
}

// 5. Size budget
const gzip = gzipSync(readFileSync(file), { level: 9 }).length;
check(size <= SIZE_BUDGET_BYTES,
  `size ${size} bytes exceeds budget ${SIZE_BUDGET_BYTES} bytes`);

console.log(`OK  ${file}: ${size} bytes (gzip ${gzip}), budget ${SIZE_BUDGET_BYTES}`);
process.exit(0);
