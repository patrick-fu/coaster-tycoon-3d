import type { Element, Rules, State, Vector } from './types.js';
import type { Course } from './motion.js';
import { type PoseFrame } from './wooden-motion.js';
import { type FlumeCourse } from './flume-native.js';
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
export declare function project(s: State, rules: Rules, request: ViewRequest, elements: ReadonlyMap<number, Element>, course: (ride: number) => Course, channelCourse: (ride: number) => FlumeCourse): {
    protocolVersion: 11;
    contentVersion: 11;
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
        boats: number;
    };
    people: Float64Array<ArrayBuffer>;
    guestBalloons: {
        id: number;
        colour: number;
    }[];
    cars: {
        id: number;
        ride: number;
        position: Vector;
        direction: Vector;
        up: Vector;
        occupants: number;
        seatIds: (number | null)[];
        rig: null | {
            kind: 'wooden-coupled-flat' | 'wooden-coupled-unbanked';
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
    boats: {
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
        id: number;
        ride: number;
        instanceId: number;
        phase: "loading" | "running" | "unloading";
        mode: "paid" | "testing" | null;
        seatIds: (number | null)[];
        seats: {
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
        channelProfile?: undefined;
        portalStations?: undefined;
        boatPhase?: undefined;
        trackProfile?: undefined;
        cars?: undefined;
        tip?: undefined;
        trackCount?: undefined;
        measured?: undefined;
        trainPhase?: undefined;
    } | {
        body?: undefined;
        anchor?: undefined;
        sessionPhase?: undefined;
        id: number;
        instanceId: number;
        content: {
            familyId: string;
            variantId: string;
            modeId: string;
        };
        presentation: import("../content/registry.js").Presentation;
        channelProfile: import("./types.js").ChannelRideProfile;
        portalStations: {
            entrance: number | null;
            exit: number | null;
        };
        name: string;
        status: "closed" | "open" | "testing";
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
        capacity: number;
        measured: {
            ticks: number;
            distance: number;
            maxSpeed: number;
            courseKey: string;
        } | null;
        boatPhase: "loading" | "running" | "unloading" | null;
        trackProfile?: undefined;
        cars?: undefined;
        trainPhase?: undefined;
    } | {
        body?: undefined;
        anchor?: undefined;
        sessionPhase?: undefined;
        channelProfile?: undefined;
        portalStations?: undefined;
        capacity?: undefined;
        boatPhase?: undefined;
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
        cars: number | undefined;
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
    products: {
        id: "independent.burger" | "independent.soft-drink";
        label: string;
        service: "drink" | "food";
        defaultPrice: number;
        maxPrice: number;
        stockCost: number;
        useUnits: number;
        container: {
            id: "emptyBurgerBox" | "emptyCan";
            label: string;
        };
    }[];
    facilities: ({
        id: number;
        instanceId: number;
        name: string;
        element: number;
        open: boolean;
        kind: 'balloon';
        price: number;
        income: number;
        sales: number;
        balloonColour: number;
        content: {
            familyId: string;
            variantId: string;
            modeId: string;
        };
        presentation: import("../content/registry.js").Presentation;
        priceBounds: {
            min: number;
            max: number;
        };
        product: {
            id: 'independent.balloon';
            label: string;
            stockCost: number;
            stockExpense: number;
            grossMargin: number;
        };
    } | {
        id: number;
        instanceId: number;
        name: string;
        element: number;
        open: boolean;
        kind: 'atm';
        withdrawals: number;
        content: {
            familyId: string;
            variantId: string;
            modeId: string;
        };
        presentation: import("../content/registry.js").Presentation;
        cashDispensed: number;
        using: number;
        guestIds: number[];
    } | {
        id: number;
        instanceId: number;
        name: string;
        element: number;
        open: boolean;
        kind: 'information';
        umbrellaColour: number;
        content: {
            familyId: string;
            variantId: string;
            modeId: string;
        };
        presentation: import("../content/registry.js").Presentation;
        products: {
            'independent.map': {
                sales: number;
                income: number;
                price: number;
                maxPrice: number;
                stockCost: number;
                stockExpense: number;
                grossMargin: number;
            };
            'independent.umbrella': {
                sales: number;
                income: number;
                price: number;
                maxPrice: number;
                stockCost: number;
                stockExpense: number;
                grossMargin: number;
            };
        };
    } | {
        id: number;
        instanceId: number;
        name: string;
        element: number;
        open: boolean;
        kind: Exclude<import("./services.js").FacilityKind, 'information' | 'atm' | 'balloon'>;
        price: number;
        income: number;
        sales: number;
        content: {
            familyId: string;
            variantId: string;
            modeId: string;
        };
        presentation: import("../content/registry.js").Presentation;
        priceBounds: {
            min: number;
            max: number;
        };
        product: {
            id: "independent.burger" | "independent.soft-drink";
            label: string;
            stockCost: number;
            stockExpense: number;
            grossMargin: number;
        } | null;
        restroom?: {
            using: number;
            exiting: number;
            guestIds: number[];
        } | undefined;
    })[];
    amenities: {
        id: number;
        kind: 'bench' | 'bin';
        path: number;
        occupant: number | null;
        fill: number;
    }[];
    litter: Float64Array<ArrayBuffer>;
    litterTypes: {
        id: number;
        containerId: "emptyBurgerBox" | "emptyCan";
    }[];
    scenery: {
        elements: Element[];
        surfaces: number[];
        truncated: boolean;
    } | null;
};
