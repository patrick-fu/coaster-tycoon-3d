import type { Path } from './types.js';
import type { PathPoint } from './people.js';
export declare class Routes {
    private paths;
    private revision;
    private byId;
    private patrols;
    private trees;
    private lookup;
    distance(paths: Map<string, Path>, revision: number, from: PathPoint, to: PathPoint, queueRide: number | null, patrol?: readonly number[]): number | null;
    next(paths: Map<string, Path>, revision: number, from: PathPoint, to: PathPoint, queueRide: number | null, patrol?: readonly number[]): PathPoint | null;
    find(paths: Map<string, Path>, revision: number, from: PathPoint, to: PathPoint, queueRide: number | null, patrol?: readonly number[]): PathPoint[];
}
