import GetKeypointsWorker from './get-keypoints-worker.ts?worker';

export const getKeypoints = (data: ImageData): Promise<ArrayBuffer> => new Promise((resolve, reject) => {
  const worker = new GetKeypointsWorker();

  worker.onmessage = (msg: MessageEvent<ArrayBuffer>) => {
    const { data } = msg;
    resolve(data);
  };
  
  worker.postMessage(data);
});