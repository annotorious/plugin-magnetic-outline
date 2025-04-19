export type Point = [number, number];

export interface MagneticOutlineOpts {

  // Default: 32 (typically 10-100)
  edgeFeatureCannyLo?: number;  

  // Default: 100 (typically 50-200)
  edgeFeatureCannyHi?: number;  

  // Default: 200
  gradientMagnitudeMaxLimit?: number;

}

export interface KeypointIndex {

  listAll(): Point[];

  neighbors(x: number, y: number, maxResults?: number, maxDistance?: number): Point[]

}