import type { Element, Rules, State, Vector } from './types.js';
import type { Course } from './motion.js';
import { type PoseFrame } from './wooden-motion.js';
export type ViewRequest = {
    bounds: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
    includeStatic: boolean;
};
export declare function validateView(value: unknown, side: number): ViewRequest;
export declare function project(s: State, rules: Rules, request: ViewRequest, elements: ReadonlyMap<number, Element>, course: (ride: number) => Course): {
    protocolVersion: 3;
    contentVersion: 3;
    coordinates: {
        nativeUnitsPerTile: number;
        nativeHeightStep: number;
        nativeLandStep: number;
        metresPerTile: number;
        evidence: 'project-candidate';
    };
    revision: string;
    worldRevision: number;
    topologyRevision: number;
    tick: number;
    paused: boolean;
    parkOpen: boolean;
    cash: number;
    loan: number;
    maxLoan: number;
    side: number;
    entry: {
        x: number;
        y: number;
        z: number;
    } | null;
    ledger: {
        rideSales: number;
        shopSales: number;
        stock: number;
        wages: number;
        upkeep: number;
        interest: number;
    };
    counts: {
        guests: number;
        staff: number;
        litter: number;
        cars: number;
    };
    people: Float64Array<ArrayBuffer>;
    cars: {
        id: number;
        ride: number;
        position: Vector;
        direction: Vector;
        up: Vector;
        occupants: number;
        seatIds: (number | null)[];
        rig: null | {
            kind: 'wooden-coupled-flat';
            bogieFront: PoseFrame;
            bogieRear: PoseFrame;
            link: PoseFrame | null;
            restraintsClosed: boolean;
        };
    }[];
    carouselSessions: {
        ride: number;
        instanceId: number;
        body: number;
        phase: "loading" | "running" | "unloading";
        phaseTick: number;
        completedCycles: number;
        angle: number;
        angleUnits: number;
        seatIds: (number | null)[];
        seats: {
            position: Vector;
            direction: Vector;
            up: Vector;
            slot: number;
            guest: number;
        }[];
    }[];
    rides: ({
        id: number;
        instanceId: number;
        content: {
            familyId: string;
            variantId: string;
            modeId: string;
        };
        presentation: import("../content/registry.js").Presentation;
        name: string;
        status: "closed" | "open" | "testing";
        price: number;
        income: number;
        broken: boolean;
        queue: number;
        body: number;
        anchor: {
            x: number;
            y: number;
            z: number;
            direction: import("./types.js").Direction;
            pitch: import("./types.js").Attitude;
            bank: import("./types.js").Attitude;
        };
        capacity: number;
        sessionPhase: "loading" | "running" | "unloading";
        trackProfile?: undefined;
        cars?: undefined;
        tip?: undefined;
        trackCount?: undefined;
        measured?: undefined;
        trainPhase?: undefined;
    } | {
        body?: undefined;
        anchor?: undefined;
        capacity?: undefined;
        sessionPhase?: undefined;
        id: number;
        instanceId: number;
        content: {
            familyId: string;
            variantId: string;
            modeId: string;
        };
        presentation: import("../content/registry.js").Presentation;
        trackProfile: import("./types.js").RideProfile | null;
        name: string;
        status: "closed" | "open" | "testing";
        cars: number;
        price: number;
        income: number;
        broken: boolean;
        queue: number;
        tip: {
            x: number;
            y: number;
            z: number;
            direction: import("./types.js").Direction;
            pitch: import("./types.js").Attitude;
            bank: import("./types.js").Attitude;
        };
        trackCount: number;
        measured: {
            ticks: number;
            distance: number;
            maxSpeed: number;
            minVerticalG: number;
            maxVerticalG: number;
            maxLateralG: number;
        } | null;
        trainPhase: "running" | "stalled" | "unloading" | "waiting" | null;
    })[];
    staff: {
        id: number;
        role: "handyman" | "mechanic";
        work: "bin" | "inspection" | "litter" | "repair" | null;
        completed: number;
    }[];
    facilities: {
        id: number;
        instanceId: number;
        name: string;
        kind: import("./services.js").FacilityKind;
        element: number;
        open: boolean;
        price: number;
        income: number;
        sales: number;
        content: {
            familyId: string;
            variantId: string;
            modeId: string;
        };
        presentation: import("../content/registry.js").Presentation;
    }[];
    amenities: {
        id: number;
        kind: 'bench' | 'bin';
        path: number;
        occupant: number | null;
        fill: number;
    }[];
    litter: Float64Array<ArrayBuffer>;
    scenery: {
        elements: Element[];
        surfaces: number[];
        truncated: boolean;
    } | null;
};
