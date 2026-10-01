// Hand-written types for the subset of OpenCV.js the plugin uses.
// Keep in sync with scripts/build-opencv/magnetic_outline.config.py and the
// API list in scripts/build-opencv/smoke-test.mjs.

export declare namespace cv {

  class Mat {
    constructor();
    constructor(rows: number, cols: number, type: number);
    readonly rows: number;
    readonly cols: number;
    readonly data: Uint8Array;
    readonly data32S: Int32Array;
    readonly data32F: Float32Array;
    delete(): void;
  }

  class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  class segmentation_IntelligentScissorsMB {
    constructor();
    setEdgeFeatureCannyParameters(threshold1: number, threshold2: number, apertureSize?: number, L2gradient?: boolean): segmentation_IntelligentScissorsMB;
    setGradientMagnitudeMaxLimit(gradientMagnitudeThresholdMax?: number): segmentation_IntelligentScissorsMB;
    applyImage(image: Mat): segmentation_IntelligentScissorsMB;
    buildMap(sourcePt: Point): void;
    getContour(targetPt: Point, contour: Mat, backward?: boolean): void;
    delete(): void;
  }

  const COLOR_BGR2GRAY: number;
  const COLOR_RGBA2GRAY: number;

  function cvtColor(src: Mat, dst: Mat, code: number, dstCn?: number): void;

  function goodFeaturesToTrack(
    image: Mat,
    corners: Mat,
    maxCorners: number,
    qualityLevel: number,
    minDistance: number,
    mask?: Mat,
    blockSize?: number,
    useHarrisDetector?: boolean,
    k?: number
  ): void;

  function imread(imageSource: HTMLImageElement | HTMLCanvasElement | string): Mat;

  function matFromImageData(imageData: ImageData | { width: number, height: number, data: ArrayLike<number> }): Mat;

  function exceptionFromPtr(ptr: number): { msg: string };

}

/** Emscripten MODULARIZE factory. Resolves once the WASM runtime is ready. */
declare function cvFactory(moduleArg?: object): Promise<typeof cv>;

export default cvFactory;
