import { Engine } from './engine.js';
export declare function createHost(engine: Engine): (message: unknown) => import("./types.js").Result<{
    id: number;
    result: {
        ok: true;
        value: void;
    } | {
        ok: true;
        value: number;
    } | {
        ok: true;
        value: import("./types.js").Quote;
    } | {
        ok: true;
        value: import("./types.js").Receipt;
    } | {
        ok: true;
        value: {
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
                position: import("./types.js").Vector;
                direction: import("./types.js").Vector;
                up: import("./types.js").Vector;
                occupants: number;
            }[];
            rides: {
                id: number;
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
                name: string;
                kind: import("./services.js").FacilityKind;
                element: number;
                open: boolean;
                price: number;
                income: number;
                sales: number;
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
                elements: import("./types.js").Element[];
                surfaces: number[];
                truncated: boolean;
            } | null;
            commandRevision: string;
        };
    } | {
        ok: true;
        value: import("./people.js").Guest | import("./services.js").Staff | import("./types.js").Element;
    } | {
        ok: false;
        error: {
            code: import("./types.js").ErrorCode;
            message: string;
        };
    } | {
        ok: true;
        value: string;
    };
}>;
