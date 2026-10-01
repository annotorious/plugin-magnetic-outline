import cv from './opencv';

export const lazy = (fn: Function) => new Promise(resolve => {
  const isLoaded = !!cv?.Mat;

  if (isLoaded)
    resolve(fn());
  else
    cv.onRuntimeInitialized = () => resolve(fn());
});