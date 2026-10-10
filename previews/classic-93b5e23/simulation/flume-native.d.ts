import type { Cell, Connector, Element, Track } from './types.js';
import { type FlumePieceId } from '../content/log-flume.js';
type CourseRide = {
    id: number;
    anchor: Connector;
    track: number[];
};
type Span = {
    begin: number;
    length: number;
    track: Track;
    piece: FlumePieceId;
    t0: number;
    t1: number;
};
export type FlumeCourse = {
    spans: Span[];
    length: number;
    stationEnd: number;
    dock: number;
    key: string;
};
export declare function flumeFrame(track: Track, t: number): {
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
};
export declare function compileFlumeCourse(ride: CourseRide, elements: Pick<ReadonlyMap<number, Element>, 'get'>): FlumeCourse;
export declare function flumeCourseFrame(course: FlumeCourse, position: number): {
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
    piece: "channel" | "drop" | "drop-end" | "drop-start" | "left" | "lift" | "lift-end" | "lift-start" | "right" | "splash" | "station";
};
export declare function flumeCells(track: Track): Cell[];
export declare function flumeGroundCells(track: Track, ground: (tile: Cell) => {
    height: number;
    water: number;
    owned: boolean;
}, maxHeight: number): Cell[];
export declare function flumeInterface(a: Track, b: Track, ride: CourseRide, elements: ReadonlyMap<number, Element>, cellA: Cell, cellB: Cell): boolean;
export {};
