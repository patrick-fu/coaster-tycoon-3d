import type { Course, Train } from './motion.js';
import type { Ride, RideProfile, Vector } from './types.js';
export type PoseFrame = {
    position: Vector;
    direction: Vector;
    up: Vector;
};
export type WoodenCarPose = {
    body: PoseFrame;
    bogieFront: PoseFrame;
    bogieRear: PoseFrame;
    link: PoseFrame | null;
    frontCourseMm: number;
    rearCourseMm: number;
};
export declare function woodenTrainPoses(train: Pick<Train, 'position' | 'carIds'>, course: Course, profile: RideProfile): WoodenCarPose[];
export declare function qualifyWoodenCourse(ride: Ride, course: Course, profile: RideProfile): void;
