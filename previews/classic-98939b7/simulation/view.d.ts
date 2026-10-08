import type { Element, Rules, State, Vector } from './types.js';
import type { Course } from './motion.js';
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
    protocolVersion: 1;
    contentVersion: 1;
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
    }[];
    rides: {
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
    }[];
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
