import cv from '@techstark/opencv-js';
import type { Point } from '../types';

self.onmessage = function(e: MessageEvent<ImageData>) {
  const { data } = e;

  lazy(() => {
    const keypoints = computeKeypoints(data);
    self.postMessage(keypoints);
  });
};

const lazy = (fn: Function) => new Promise(resolve => {
  const isLoaded = !!cv?.Mat;

  if (isLoaded)
    resolve(fn());
  else
    cv.onRuntimeInitialized = () => resolve(fn());
});

const computeKeypoints = (data: ImageData) => {
  const mat = cv.matFromImageData(data);
  cv.cvtColor(mat, mat, cv.COLOR_BGR2GRAY); // convert to 1-channel

  // const kp = new cv.KeyPointVector();

  // @ts-ignore
  // const fast = new cv.FastFeatureDetector();
  // fast.setThreshold(50);
  // fast.detect(mat, kp);

  /** Good feature to track */
  const corners = new cv.Mat();
  const none = new cv.Mat();

  cv.goodFeaturesToTrack(
    mat,           // Input image (must be grayscale)
    corners,        // Output Matrix to store corners
    1000,     // Maximum number of corners to detect
    0.01,   // Quality level (minimal accepted quality of corners)
    2,    // Minimum euclidean distance between corners
    none,          // Optional mask
    5,             // Block size for computing derivatives
    false,         // Use Harris detector or cornerMinEigenVal
    0.04           // Harris detector free parameter
  );

  // let features = new cv.Mat();
  // cv.goodFeaturesToTrack(src, features, 500, 0.01, 10);

  // const arr: number[] = [];
  const keypoints: Point[] = [];

  /*
  for (let i=0; i<kp.size(); i++) {
    const { x, y } = kp.get(i).pt;
    keypoints.push({x, y});
  }
  */

  for (let i = 0; i < corners.rows; i++) {
    const x = corners.data32F[i * 2];
    const y = corners.data32F[i * 2 + 1];
    keypoints.push({ x, y });
  }

  return keypoints;
}

export {}; // Necessary for Vite to treat this as a module