import Flatbush from 'flatbush';
import type { KeypointIndex, Point } from '../types';
import GetKeypointsWorker from './get-keypoints-worker.ts?worker';

const createIndex = (points: Point[]) => {
  if (points.length === 0) {
    // Not great, but maintains the interface and prevents flatbush
    // error for 0-size index.
    return {
      listAll: () => ([] as Point[]),
      neighbors: (x: number, y: number, maxResults?: number, maxDistance?: number) => ([] as Point[])
    }
  };

  const flatbush = new Flatbush(points.length);

  for (const p of points)
    flatbush.add(p[0], p[1], p[0], p[1]);
  
  flatbush.finish();

  const listAll = () => ([...points]);

  const neighbors = (x: number, y: number, maxResults?: number, maxDistance?: number) => {
    const idx = flatbush.neighbors(x, y, maxResults, maxDistance);
    return idx.map(i => points[i]);
  }

  return { listAll, neighbors };
}

export const getKeypoints = (data: ImageData): Promise<KeypointIndex> => new Promise(resolve => {
  const worker = new GetKeypointsWorker();

  worker.onmessage = (msg: MessageEvent<Point[]>) => {
    const { data } = msg;
    resolve(createIndex(data));
  };
  
  worker.postMessage(data);
});