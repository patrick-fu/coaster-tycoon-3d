import type { Amenity, AmenityElement, Litter, HousekeepingRules } from './housekeeping.js';
import type { GuestRules, PeopleState, Ledger } from './people.js';
import type { Facility, FacilityElement, Staff, ServiceRules } from './services.js';
import type { MotionRules, Train } from './motion.js';
import type { SceneryRules, SceneryType } from './scenery.js';
export type Direction = 0 | 1 | 2 | 3;
export type Attitude = -1 | 0 | 1;
export type Tile = {
    x: number;
    y: number;
};
export type Connector = {
    x: number;
    y: number;
    z: number;
    direction: Direction;
    pitch: Attitude;
    bank: Attitude;
};
export type Cell = {
    x: number;
    y: number;
    low: number;
    high: number;
    mask: number;
};
export type Vector = {
    x: number;
    y: number;
    z: number;
};
export type PieceRule = {
    motion: {
        samples: Vector[];
        chain: boolean;
        brake: number | null;
    };
    price: number;
    station: boolean;
    end: {
        x: number;
        y: number;
        z: number;
        turn: number;
        pitch: Attitude;
        bank: Attitude;
    };
    entry: {
        pitch: Attitude;
        bank: Attitude;
    };
    cells: Cell[];
};
export type Rules = {
    scenery: SceneryRules;
    housekeeping: HousekeepingRules;
    services: ServiceRules;
    guests: GuestRules;
    motion: MotionRules;
    id: string;
    evidence: 'project-candidate' | 'reference-verified';
    pathPrice: number;
    portalPrice: number;
    terrainPrice: number;
    refundPerThousand: number;
    maxSupport: number;
    maxHeight: number;
    pieces: Record<string, PieceRule>;
};
export type WorldOptions = {
    side: number;
    cash: number;
    maxLoan: number;
    seed: number;
    land?: {
        tile: Tile;
        height: number;
        water: number;
        owned: boolean;
    }[];
};
export type Track = {
    id: number;
    kind: 'track';
    ride: number;
    piece: string;
    origin: Connector;
};
export type Path = {
    id: number;
    kind: 'path';
    tile: Tile;
    height: number;
    queueFor: number | null;
};
export type Portal = {
    id: number;
    kind: 'portal';
    ride: number;
    station: number;
    role: 'entrance' | 'exit';
    tile: Tile;
    height: number;
    direction: Direction;
};
export type Scenery = {
    id: number;
    kind: 'scenery';
    sceneryType: SceneryType;
    tile: Tile;
    height: number;
};
export type Element = Track | Path | Portal | FacilityElement | AmenityElement | Scenery;
export type Ride = {
    id: number;
    name: string;
    anchor: Connector;
    track: number[];
    status: 'closed' | 'testing' | 'open';
    cars: number;
    price: number;
    income: number;
    broken: boolean;
    lastInspection: number;
    queue: number[];
};
export type State = {
    version: 7;
    amenities: Amenity[];
    litter: Litter[];
    facilities: Facility[];
    retiredShopIncome: number;
    retiredStock: number;
    staff: Staff[];
    rules: string;
    side: number;
    tick: number;
    revision: number;
    topologyRevision: number;
    rng: number;
    paused: boolean;
    initialCash: number;
    cash: number;
    loan: number;
    maxLoan: number;
    spent: number;
    refunded: number;
    nextElement: number;
    nextEntity: number;
    people: PeopleState;
    ledger: Ledger;
    trains: Train[];
    terrain: number[];
    water: number[];
    owned: boolean[];
    rides: Ride[];
    elements: Element[];
};
export type Command = {
    type: 'create-ride';
    name: string;
    tile: Tile;
    height: number;
    direction: Direction;
} | {
    type: 'append-track';
    ride: number;
    piece: string;
} | {
    type: 'remove-last-track';
    ride: number;
} | {
    type: 'place-scenery';
    sceneryType: SceneryType;
    tile: Tile;
    height: number;
} | {
    type: 'remove-scenery';
    id: number;
} | {
    type: 'place-path';
    tile: Tile;
    height: number;
    queueFor: number | null;
} | {
    type: 'remove-path';
    id: number;
} | {
    type: 'set-terrain';
    tile: Tile;
    height: number;
    water: number;
} | {
    type: 'place-portal';
    ride: number;
    station: number;
    role: 'entrance' | 'exit';
    tile: Tile;
    height: number;
    direction: Direction;
} | {
    type: 'remove-portal';
    id: number;
} | {
    type: 'set-ride-status';
    ride: number;
    status: 'closed' | 'testing' | 'open';
} | {
    type: 'reset-train';
    ride: number;
} | {
    type: 'set-train-cars';
    ride: number;
    cars: number;
} | {
    type: 'set-park-entrance';
    point: {
        x: number;
        y: number;
        z: number;
    } | null;
} | {
    type: 'set-park-open';
    open: boolean;
} | {
    type: 'set-ride-price';
    ride: number;
    price: number;
} | {
    type: 'set-ride-broken';
    ride: number;
    broken: boolean;
} | {
    type: 'place-amenity';
    kind: 'bench' | 'bin';
    path: number;
} | {
    type: 'remove-amenity';
    id: number;
} | {
    type: 'place-facility';
    name: string;
    kind: 'food' | 'drink' | 'restroom';
    tile: Tile;
    height: number;
    direction: Direction;
} | {
    type: 'set-facility-open';
    facility: number;
    open: boolean;
} | {
    type: 'set-facility-price';
    facility: number;
    price: number;
} | {
    type: 'remove-facility';
    facility: number;
} | {
    type: 'hire-staff';
    role: 'mechanic' | 'handyman';
    point: {
        x: number;
        y: number;
        z: number;
    };
} | {
    type: 'fire-staff';
    staff: number;
} | {
    type: 'set-staff-patrol';
    staff: number;
    tiles: Tile[];
} | {
    type: 'set-loan';
    amount: number;
} | {
    type: 'set-paused';
    paused: boolean;
};
export type ErrorCode = 'INVALID_COMMAND' | 'STALE_REVISION' | 'OFF_MAP' | 'NOT_OWNED' | 'GEOMETRY' | 'CLEARANCE' | 'SUPPORT' | 'CAPACITY' | 'INSUFFICIENT_CASH' | 'UNKNOWN_RIDE' | 'UNKNOWN_ELEMENT' | 'CIRCUIT_CLOSED' | 'RIDE_ACTIVE' | 'OPERATING_REQUIREMENTS' | 'INVALID_SAVE' | 'WRONG_RULES';
export type Result<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: {
        code: ErrorCode;
        message: string;
    };
};
export type Quote = {
    revision: string;
    cost: number;
    cells: Cell[];
    endpoint?: Connector;
};
export type Receipt = {
    revision: string;
    cost: number;
    id?: number;
};
export declare const LIMITS: {
    readonly mapMin: 15;
    readonly mapMax: 256;
    readonly rideSlots: 255;
    readonly sharedEntities: 10000;
    readonly staff: 200;
    readonly tileElements: 196096;
    readonly surfaceRecords: 65536;
};
