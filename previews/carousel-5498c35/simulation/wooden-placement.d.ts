import type { Cell, Element, Portal, Ride, Rules, Track } from './types.js';
type Bounds = {
    x0: number;
    y0: number;
    z0: number;
    x1: number;
    y1: number;
    z1: number;
};
export declare function portalMountYaw(portal: Portal, station: Track): 0 | 2;
export declare function woodenTransition(portal: Portal, station: Track): {
    gate: {
        x: number;
        y: number;
        z: number;
    };
    bottom: {
        x: number;
        y: number;
        z: number;
    };
    landing: {
        x: number;
        y: number;
        z: number;
    };
    ingress: {
        x: number;
        y: number;
        z: number;
    };
    approach: {
        x: number;
        y: number;
        z: number;
    };
    bounds: Bounds;
    yaw: 0 | 2;
    normal: {
        x: number;
        y: -1 | 0 | 1;
    };
};
export declare function woodenPortalCells(portal: Portal, station: Track): Cell[];
export declare function woodenInterface(a: Element, b: Element, rides: ReadonlyMap<number, Ride>, elements: ReadonlyMap<number, Element>, common: Rules): boolean;
export {};
