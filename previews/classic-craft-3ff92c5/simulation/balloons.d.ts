import type { Rules, State } from './types.js';
import type { Guest, PathPoint, Routing } from './people.js';
import { type ServiceIndex } from './services.js';
export declare function chooseBalloon(g: Guest, s: State, rules: Rules, index: ServiceIndex, route: Routing): {
    facility: number;
    goal: PathPoint;
} | null;
export declare function buyBalloon(g: Guest, s: State, rules: Rules, index: ServiceIndex): 'purchased' | 'refused' | 'unavailable';
