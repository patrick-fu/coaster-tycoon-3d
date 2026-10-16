import type { Rules, State } from './types.js';
import type { Guest, PathPoint, Routing } from './people.js';
import { type ServiceIndex } from './services.js';
export declare function chooseInformation(g: Guest, s: State, rules: Rules, index: ServiceIndex, route: Routing): {
    facility: number;
    counter: number;
    goal: PathPoint;
} | null;
export declare function buyInformation(g: Guest, s: State, rules: Rules, index: ServiceIndex): 'purchased' | 'refused' | 'unavailable';
