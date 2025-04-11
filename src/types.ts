export type Point = [number, number];

export interface KeypointIndex {

  listAll(): Point[];

  neighbors(x: number, y: number, maxResults?: number, maxDistance?: number): Point[]

}