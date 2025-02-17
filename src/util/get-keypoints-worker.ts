import cv from '@techstark/opencv-js';

self.onmessage = function(e: MessageEvent<ImageData>) {
  const { data } = e;

  lazy(() => {
    const keypoints = computeKeypoints(data);
    const buffer: ArrayBuffer = new Uint16Array(keypoints).buffer;
    self.postMessage(buffer);
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

  const kp = new cv.KeyPointVector();

  // @ts-ignore
  const fast = new cv.FastFeatureDetector();
  fast.setThreshold(20);
  fast.detect(mat, kp);

  const arr: number[] = [];

  for (let i=0; i<kp.size(); i++) {
    const { x, y } = kp.get(i).pt;
    arr.push(x);
    arr.push(y);
  }

  return arr;
}

export {}; // Necessary for Vite to treat this as a module