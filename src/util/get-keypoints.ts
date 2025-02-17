import Flatbush from 'flatbush';
import type { KeypointIndex, Point } from '../types';
import GetKeypointsWorker from './get-keypoints-worker.ts?worker';

const createIndex = (points: Point[]) => {
  const flatbush = new Flatbush(points.length);

  for (const p of points)
    flatbush.add(p.x, p.y, p.x, p.y);
  
  flatbush.finish();

  const neighbors = (x: number, y: number, maxResults?: number, maxDistance?: number) => {
    const idx = flatbush.neighbors(x, y, maxResults, maxDistance);
    return idx.map(i => points[i]);
  }

  return { neighbors };
}

export const getKeypoints = (data: ImageData): Promise<KeypointIndex> => new Promise(resolve => {
  const worker = new GetKeypointsWorker();

  worker.onmessage = (msg: MessageEvent<Point[]>) => {
    const { data } = msg;
    resolve(createIndex(data));
  };
  
  worker.postMessage(data);
});