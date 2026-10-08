import cv from './opencv';

/**
 * OpenCV.js surfaces C++ exceptions as a raw number: a pointer to the
 * exception object in the WASM heap. Turns it into the readable message
 * where possible.
 */
export const decodeCvException = (e: unknown): string => {
  if (typeof e !== 'number') return String(e);

  try {
    const { msg } = cv.exceptionFromPtr(e);
    // Non-cv::Exception types (e.g. bad_alloc) don't decode
    return msg || `OpenCV error ${e}`;
  } catch {
    return `OpenCV error ${e}`;
  }
}

/**
 * Runs an OpenCV call without letting errors escape. Errors are logged,
 * passed to onError (if any), and the call returns undefined.
 */
export const cvCall = <T>(fn: () => T, onError?: (msg: string) => void): T | undefined => {
  try {
    return fn();
  } catch (e) {
    const msg = decodeCvException(e);
    console.warn('[magnetic-outline] OpenCV error:', msg);
    onError?.(msg);
    return undefined;
  }
}
