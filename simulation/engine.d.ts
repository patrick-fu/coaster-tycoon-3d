import { type Element, type Quote, type Receipt, type Result, type Rules, type State, type WorldOptions } from './types.js';
import { type Guest } from './people.js';
import { type Staff } from './services.js';
export declare class Engine {
    private session;
    private generation;
    private courses;
    private channels;
    private routes;
    private state;
    private rules;
    private index;
    constructor(options: WorldOptions, rules: Rules);
    get revision(): string;
    view(input: unknown): Result<{
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
            position: import("./types.js").Vector;
            direction: import("./types.js").Vector;
            up: import("./types.js").Vector;
            occupants: number;
            seatIds: (number | null)[];
            rig: null | {
                kind: 'wooden-coupled-flat' | 'wooden-coupled-unbanked';
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
        commandRevision: string;
    }>;
    inspect(kind: unknown, id: unknown): Result<Guest | Staff | Element>;
    snapshot(): State;
    catalogue(): {
        contentVersion: 11;
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
                        profileId: 'independent-circuit-v1' | 'independent.wooden-circuit-v1' | 'independent.wooden-rise-return-v2';
                    } | {
                        kind: 'channel';
                        profileId: 'independent.log-flume-v1';
                    } | {
                        kind: 'fixed';
                        profileId: 'independent.carousel-v1';
                    } | {
                        kind: 'facility';
                        service: "drink" | "food" | "restroom";
                        profileId: 'independent-services-v1';
                    } | {
                        kind: 'facility';
                        service: 'food' | 'drink';
                        profileId: 'independent.consumables-v1' | 'independent.detailed-stalls-v1';
                        productId: import("../content/consumables.js").ProductId;
                    } | {
                        kind: 'facility';
                        service: 'restroom';
                        profileId: 'independent.gradual-restroom-v1';
                    } | {
                        kind: 'facility';
                        service: 'information';
                        profileId: 'independent.information-kiosk-v1';
                    } | {
                        kind: 'facility';
                        service: 'atm';
                        profileId: 'independent.atm-v1';
                    } | {
                        kind: 'facility';
                        service: 'balloon';
                        profileId: 'independent.balloon-stall-v1';
                    } | {
                        kind: 'unimplemented';
                        referenceShape: string;
                    };
                    operation: {
                        kind: 'circuit';
                        profileId: 'independent-circuit-v1' | 'independent.wooden-circuit-v1' | 'independent.wooden-rise-return-v2';
                    } | {
                        kind: 'channel-circuit';
                        profileId: 'independent.log-flume-v1';
                    } | {
                        kind: 'rotation';
                        profileId: 'independent.carousel-v1';
                    } | {
                        kind: 'service';
                        service: "drink" | "food" | "restroom";
                        profileId: 'independent-services-v1';
                    } | {
                        kind: 'service';
                        service: 'food' | 'drink';
                        profileId: 'independent.consumables-v1';
                        productId: import("../content/consumables.js").ProductId;
                    } | {
                        kind: 'service';
                        service: 'restroom';
                        profileId: 'independent.gradual-restroom-service-v1';
                    } | {
                        kind: 'service';
                        service: 'information';
                        profileId: 'independent.merchandise-v1';
                    } | {
                        kind: 'service';
                        service: 'atm';
                        profileId: 'independent.atm-withdrawal-v1';
                    } | {
                        kind: 'service';
                        service: 'balloon';
                        profileId: 'independent.balloon-v1';
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
    exportSave(): string;
    restoreSave(input: unknown): Result<void>;
    quote(input: unknown): Result<Quote>;
    execute(input: unknown, expectedRevision: string): Result<Receipt>;
    advance(ticks: number): Result<number>;
    circuit(ride: number): Result<boolean>;
    route(from: {
        x: number;
        y: number;
        z: number;
    }, to: {
        x: number;
        y: number;
        z: number;
    }, queueRide?: number | null): Result<{
        x: number;
        y: number;
        z: number;
    }[]>;
    operating(ride: number): Result<import("./operation.js").Eligibility>;
    access(ride: number, from: {
        x: number;
        y: number;
        z: number;
    }): Result<{
        entrances: number[];
        exits: number[];
    }>;
    private bounds;
    private owned;
    private ride;
    private navigation;
    private rideRules;
    private course;
    private trackRide;
    private tracked;
    private channelCourse;
    private editable;
    private discardTrain;
    private tip;
    private cells;
    private clear;
    private add;
    private remove;
    private finances;
    private plan;
    private trackTopology;
    private validateMerchandiseAccounts;
    private indexState;
    private validateTrains;
    private validateCarouselSessions;
    private validateBoats;
    private validatePeople;
    private validateServices;
    private validateHousekeeping;
}
