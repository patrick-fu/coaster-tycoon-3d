import type { Cell, Direction, FixedBody, FixedRideProfile, Portal, Ride, Rules, Vector } from './types.js';
export type CarouselSession = {
    ride: number;
    seats: (number | null)[];
    phase: 'loading' | 'running' | 'unloading';
    phaseTick: number;
    completedCycles: number;
};
export declare function fixedProfile(content: Ride['content'], rules: Rules): FixedRideProfile | null;
export declare function validateFixedProfiles(input: Rules['fixedProfiles'], rules: Rules): Record<string, FixedRideProfile>;
export declare function newCarouselSession(ride: number): CarouselSession;
export declare function carouselCycleTicks(p: FixedRideProfile): number;
export declare function carouselAngle(session: CarouselSession, p: FixedRideProfile): number;
export declare function carouselEditable(session: CarouselSession): boolean;
export declare function fixedBodyCells(body: FixedBody, p: FixedRideProfile): Cell[];
export declare function carouselPortal(body: FixedBody, role: Portal['role']): {
    tile: {
        x: number;
        y: number;
    };
    height: number;
    direction: Direction;
};
export declare function carouselSeatFrame(body: FixedBody, seat: FixedRideProfile['seats'][number], angle: number, p: FixedRideProfile): {
    position: Vector;
    direction: Vector;
    up: Vector;
};
