import type { Cell, Connector, Element, Portal } from './types.js';
type PortalRide = {
    id: number;
    anchor: Connector;
    track: number[];
};
type Elements = Pick<ReadonlyMap<number, Element>, 'get' | 'values'>;
export declare function flumePortalSocket(ride: PortalRide, elements: Elements, role: Portal['role'], side?: Portal['direction']): {
    station: number;
    tile: {
        x: number;
        y: number;
    };
    height: number;
    direction: import("./types.js").Direction;
};
export declare function validateFlumePortal(portal: Portal, ride: PortalRide, elements: Elements): void;
export declare function flumePortalCells(portal: Portal): Cell[];
export declare function flumePortalInterface(a: Element, b: Element, ride: PortalRide, elements: ReadonlyMap<number, Element>, cellA: Cell, cellB: Cell): boolean;
export {};
