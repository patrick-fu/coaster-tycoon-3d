import type { Guest, PathPoint, Routing } from './people.js';
import type { Rules, State } from './types.js';
import { type ServiceIndex } from './services.js';
export declare function chooseAtm(g: Guest, s: State, rules: Rules, index: ServiceIndex, route: Routing): {
    facility: number;
    goal: PathPoint;
} | null;
export declare function admitAtm(g: Guest, s: State, rules: Rules, index: ServiceIndex): boolean;
export declare function stepAtm(g: Guest, rules: Rules, index: ServiceIndex): void;
