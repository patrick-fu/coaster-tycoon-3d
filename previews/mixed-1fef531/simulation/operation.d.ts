import type { Element, Portal, Ride, Rules } from './types.js';
export type Station = {
    id: number;
    track: number[];
};
export type Eligibility = {
    circuit: boolean;
    stations: Station[];
    issues: string[];
};
type Elements = Pick<ReadonlyMap<number, Element>, 'get' | 'values'>;
export declare function stationGroups(ride: Ride, elements: Elements, rules: Rules): Station[];
export declare function validatePortal(portal: Portal, ride: Ride, elements: Elements, rules: Rules): void;
export declare function eligibility(ride: Ride, elements: Elements, rules: Rules): Eligibility;
export declare function portalApproach(portal: Portal): {
    x: number;
    y: number;
    z: number;
};
export {};
