import type { Guest, PathPoint, Routing } from './people.js';
import type { ServiceIndex } from './services.js';
import { type State, type Rules, type Tile } from './types.js';
import type { ContainerId } from '../content/consumables.js';
export type Amenity = {
    id: number;
    kind: 'bench' | 'bin';
    path: number;
    occupant: number | null;
    fill: number;
};
export type AmenityElement = {
    id: number;
    kind: 'amenity';
    amenityType: 'bench' | 'bin';
    path: number;
    tile: Tile;
    height: number;
};
export type Litter = {
    id: number;
    point: PathPoint;
    containerId?: ContainerId;
};
export type CleanupJob = {
    kind: 'litter' | 'bin';
    target: number;
};
export type HousekeepingRules = {
    buildPrice: number;
    binCapacity: number;
    restTicks: number;
    restEnergy: number;
    restNausea: number;
    energyThreshold: number;
    nauseaThreshold: number;
    wrapperTicks: number;
    cleanupTicks: number;
};
export declare function validateHousekeepingRules(input: HousekeepingRules): HousekeepingRules;
export declare function amenityPoint(a: Amenity, index: ServiceIndex): PathPoint | null;
export declare function carriesWaste(g: Guest): boolean;
export declare function releaseAmenity(g: Guest, index: ServiceIndex): void;
export declare function chooseAmenity(g: Guest, s: State, rules: Rules, index: ServiceIndex, route: Routing): {
    amenity: number;
    goal: PathPoint;
} | null;
export declare function amenityAvailable(g: Guest, rules: Rules, index: ServiceIndex): boolean;
export declare function useAmenity(g: Guest, rules: Rules, index: ServiceIndex): void;
export declare function rest(g: Guest, rules: Rules, index: ServiceIndex): void;
export declare function dropLitter(g: Guest, s: State, rules: Rules, index: ServiceIndex): void;
export declare function recoverCleanup(s: State, index: ServiceIndex, route: Routing): void;
export declare function stepHandymen(s: State, rules: Rules, index: ServiceIndex, route: Routing): void;
