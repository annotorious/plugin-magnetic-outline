export type Point = { x: number, y: number };

export interface KeypointIndex {

  neighbors(x: number, y: number, maxResults?: number, maxDistance?: number): Point[]

}