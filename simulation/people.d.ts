import { type Element, type Path, type Portal, type Ride, type Rules, type State } from './types.js';
import { type ServiceIndex } from './services.js';
import type { Train } from './motion.js';
import { type CarouselSession } from './carousel.js';
import type { Boat } from './boat.js';
import type { ContainerId, ProductId } from '../content/consumables.js';
export type HeldItem = null | {
    readonly kind: 'consumable';
    readonly productId: ProductId;
    readonly remaining: number;
} | {
    readonly kind: 'container';
    readonly containerId: ContainerId;
    readonly sinceTick: number;
};
export type PathPoint = {
    readonly x: number;
    readonly y: number;
    readonly z: number;
};
export type GuestRules = {
    spawnTicks: number;
    walkTicks: number;
    decisionTicks: number;
    needTicks: number;
    queueSlotsPerTile: number;
    patienceTicks: number;
    rideCooldownTicks: number;
    defaultRidePrice: number;
    maxRidePrice: number;
    cashMin: number;
    cashMax: number;
    fareMin: number;
    fareMax: number;
    forceMin: number;
    forceMax: number;
    initialHunger: number;
    initialThirst: number;
    initialHappiness: number;
    initialEnergy: number;
    needGrowth: number;
    rideHappiness: number;
    rideNausea: number;
};
export type Ledger = {
    rideSales: number;
    shopSales: number;
    stock: number;
    wages: number;
    upkeep: number;
    interest: number;
};
export type Guest = {
    id: number;
    held: HeldItem;
    navigationRide: number | null;
    amenity: number | null;
    restProgress: number;
    wrapper: boolean;
    wrapperTick: number;
    facility: number | null;
    serviceProgress: number;
    bladder: number;
    point: PathPoint;
    phase: 'walking' | 'queued' | 'riding' | 'stranded' | 'leaving' | 'buying' | 'resting';
    goal: PathPoint | null;
    next: PathPoint | null;
    walkProgress: number;
    destination: number | null;
    entrance: number | null;
    exit: number | null;
    queueRide: number | null;
    seat: {
        ride: number;
        slot: number;
    } | null;
    initialCash: number;
    cash: number;
    spent: number;
    fareLimit: number;
    forceTolerance: number;
    hunger: number;
    thirst: number;
    nausea: number;
    happiness: number;
    energy: number;
    queuedAt: number;
    lastRide: number | null;
    lastRideTick: number;
    ridesTaken: number;
    thought: 'none' | 'not-enough-cash' | 'too-intense' | 'path-lost' | 'ride-closed' | 'queue-too-long' | 'price-changed' | 'payment-blocked' | 'leaving';
};
export type PeopleState = {
    entry: PathPoint | null;
    open: boolean;
    guests: Guest[];
    departedSpent: number;
};
type Access = {
    entrance: Portal;
    exit: Portal;
    front: PathPoint;
    out: PathPoint;
    body: PathPoint[];
};
export type PeopleIndex = {
    elements: Map<number, Element>;
    paths: Map<string, Path>;
    rides: Map<number, Ride>;
    trains: Map<number, Train>;
    carouselSessions: Map<number, CarouselSession>;
    boats: Map<number, Boat>;
    guests: Map<number, Guest>;
    accessCache: Map<number, {
        stamp: string;
        value: Access | null;
    }>;
};
export type Routing = {
    find: (from: PathPoint, to: PathPoint, ride: number | null, patrol?: readonly number[]) => PathPoint[];
    next: (from: PathPoint, to: PathPoint, ride: number | null, patrol?: readonly number[]) => PathPoint | null;
    distance: (from: PathPoint, to: PathPoint, ride: number | null, patrol?: readonly number[]) => number | null;
};
export declare function detachRideGuests(ride: number, state: State, index: ServiceIndex, route: Routing): void;
export declare function recoverPeople(state: State, rules: Rules, index: ServiceIndex, route: Routing): void;
export declare function stepPeople(state: State, rules: Rules, index: ServiceIndex, route: Routing): void;
export declare function boardGuests(train: Train, state: State, rules: Rules, index: ServiceIndex, route: Routing): void;
export declare function boardCarousel(session: Pick<CarouselSession, 'ride' | 'seats' | 'phase'>, state: State, rules: Rules, index: ServiceIndex, route: Routing): boolean;
export declare function boardBoat(boat: Boat, state: State, rules: Rules, index: ServiceIndex, route: Routing): boolean;
export declare function unloadBoat(boat: Boat, state: State, rules: Rules, index: PeopleIndex, route: Routing): boolean;
export declare function unloadGuests(train: Pick<Train, 'ride' | 'seats'> & {
    measured?: Train['measured'];
}, state: State, rules: Rules, index: PeopleIndex, route: Routing, effects?: {
    happiness: number;
    nausea: number;
}): boolean;
export {};
