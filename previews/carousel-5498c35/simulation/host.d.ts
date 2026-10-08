import { Engine } from './engine.js';
export declare function createHost(engine: Engine): (message: unknown) => import("./types.js").Result<{
    id: number;
    protocolVersion: 3;
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
                position: import("./types.js").Vector;
                direction: import("./types.js").Vector;
                up: import("./types.js").Vector;
                occupants: number;
                seatIds: (number | null)[];
                rig: null | {
                    kind: 'wooden-coupled-flat';
                    bogieFront: import("./wooden-motion.js").PoseFrame;
                    bogieRear: import("./wooden-motion.js").PoseFrame;
                    link: import("./wooden-motion.js").PoseFrame | null;
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
                    position: import("./types.js").Vector;
                    direction: import("./types.js").Vector;
                    up: import("./types.js").Vector;
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
        value: {
            contentVersion: 3;
            families: {
                id: string;
                label: string;
                category: string;
                reference: {
                    originalSlot: number;
                    sourceUrl: string;
                } | null;
            }[];
            variants: {
                id: string;
                label: string;
                reference: {
                    id: string;
                    sourceUrl: string;
                } | null;
                choices: {
                    familyId: string;
                    modeIds: string[];
                    capabilities: {
                        construction: {
                            kind: 'tracked';
                            profileId: 'independent-circuit-v1' | 'independent.wooden-circuit-v1';
                        } | {
                            kind: 'fixed';
                            profileId: 'independent.carousel-v1';
                        } | {
                            kind: 'facility';
                            service: "drink" | "food" | "restroom";
                            profileId: 'independent-services-v1';
                        } | {
                            kind: 'unimplemented';
                            referenceShape: string;
                        };
                        operation: {
                            kind: 'circuit';
                            profileId: 'independent-circuit-v1' | 'independent.wooden-circuit-v1';
                        } | {
                            kind: 'rotation';
                            profileId: 'independent.carousel-v1';
                        } | {
                            kind: 'service';
                            service: "drink" | "food" | "restroom";
                            profileId: 'independent-services-v1';
                        } | {
                            kind: 'unimplemented';
                        };
                        presentation: import("../content/registry.js").Presentation;
                    };
                    runtimeAvailable: boolean;
                }[];
            }[];
            modes: {
                id: string;
                label: string;
                evidence: 'project-candidate' | 'reconstructed-reference';
            }[];
        };
    } | {
        ok: true;
        value: string;
    };
}>;
