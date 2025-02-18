export type Point = { x: number, y: number };

export interface KeypointIndex {

  listAll(): Point[];

  neighbors(x: number, y: number, maxResults?: number, maxDistance?: number): Point[]

}