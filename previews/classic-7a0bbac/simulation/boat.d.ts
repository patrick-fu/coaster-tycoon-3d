import { type FlumeProfile } from '../content/log-flume.js';
import { type FlumeCourse } from './flume-native.js';
export type BoatMeasurements = {
    ticks: number;
    distance: number;
    maxSpeed: number;
};
export type Boat = {
    id: number;
    ride: number;
    seats: (number | null)[];
    phase: 'loading' | 'running' | 'unloading';
    position: number;
    travelled: number;
    speed: number;
    wait: number;
    laps: number;
    docking: boolean;
    mode: 'testing' | 'paid' | null;
    stats: BoatMeasurements;
    measured: (BoatMeasurements & {
        courseKey: string;
    }) | null;
};
export declare function createBoat(id: number, ride: number, course: FlumeCourse): Boat;
export declare function boatEditable(boat: Boat, course: FlumeCourse): boolean;
export declare function boatQualified(boat: Boat, course: FlumeCourse, p?: FlumeProfile): boolean;
export declare function stepBoat(boat: Boat, course: FlumeCourse, p: FlumeProfile, dispatch: Boat['mode']): void;
export declare function finishBoatUnloading(boat: Boat, course: FlumeCourse, p?: FlumeProfile): void;
export declare function boatFrame(boat: Boat, course: FlumeCourse, p?: FlumeProfile): {
    direction: {
        x: number;
        y: number;
        z: number;
    };
    up: {
        x: number;
        y: number;
        z: number;
    };
    piece: "channel" | "drop" | "drop-end" | "drop-start" | "left" | "lift" | "lift-end" | "lift-start" | "right" | "splash" | "station";
    position: {
        x: number;
        y: number;
        z: number;
    };
};
export declare function boatSeatFrames(boat: Boat, course: FlumeCourse, p?: FlumeProfile): {
    slot: number;
    position: {
        x: number;
        y: number;
        z: number;
    };
    direction: {
        x: number;
        y: number;
        z: number;
    };
    up: {
        x: number;
        y: number;
        z: number;
    };
}[];
