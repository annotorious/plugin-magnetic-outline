import factory from '../../vendor/opencv/opencv.js';
import type { cv as OpenCV } from '../../vendor/opencv/opencv.js';

type CompatCV = typeof OpenCV & { onRuntimeInitialized?: () => void };

// @techstark/opencv-js-style object on top of the Promise-based factory of the
// custom build (see scripts/build-opencv/): members appear once the runtime is
// ready, then onRuntimeInitialized fires. lazy() relies on exactly this.
const cv = {} as CompatCV;

// Type-only namespace merged with the value, so cv.Mat etc. also work as types
declare namespace cv {
  type Mat = OpenCV.Mat;
  type Point = OpenCV.Point;
  type segmentation_IntelligentScissorsMB = OpenCV.segmentation_IntelligentScissorsMB;
}

factory().then(m => {
  for (const k of Object.keys(m))
    if (k !== 'onRuntimeInitialized')
      (cv as Record<string, unknown>)[k] = (m as Record<string, unknown>)[k];

  cv.onRuntimeInitialized?.();
});

export default cv;
