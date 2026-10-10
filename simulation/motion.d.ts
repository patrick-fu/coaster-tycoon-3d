import type { Element, TrackedRide, Rules, Vector } from './types.js';
export type MotionRules = {
    tickHz: number;
    tileMetres: number;
    gravity: number;
    rolling: number;
    drag: number;
    stationSpeed: number;
    chainSpeed: number;
    brakeDeceleration: number;
    carLength: number;
    seatsPerCar: number;
    maxCars: number;
    waitTicks: number;
    unloadTicks: number;
    bankDegrees: number;
};
type Segment = {
    begin: number;
    length: number;
    point: Vector;
    tangent: Vector;
    normal: Vector;
    curvature: Vector;
    station: boolean;
    chain: boolean;
    brake: number | null;
};
export type Course = {
    segments: Segment[];
    length: number;
    stationLength: number;
    stationEnd: number;
};
export type Measurements = {
    ticks: number;
    distance: number;
    maxSpeed: number;
    minVerticalG: number;
    maxVerticalG: number;
    maxLateralG: number;
};
export type Train = {
    ride: number;
    carIds: number[];
    seats: (number | null)[];
    phase: 'waiting' | 'running' | 'unloading' | 'stalled';
    position: number;
    travelled: number;
    speed: number;
    wait: number;
    laps: number;
    stats: Measurements;
    measured: Measurements | null;
};
export declare function compileCourse(ride: TrackedRide, elements: Map<number, Element>, rules: Rules, motion: MotionRules): Course;
export declare function carPose(course: Course, position: number): {
    position: Vector;
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
export declare function createTrain(ride: number, carIds: number[], course: Course, rules: MotionRules): Train;
export declare function stepTrain(train: Train, course: Course, rules: MotionRules, dispatch: boolean): void;
export {};
