export declare class FixedClock {
    private hz;
    private balance;
    private last;
    speed: number;
    constructor(hz: number, now: number);
    poll(now: number, paused: boolean, maxTicks?: number): {
        ticks: number;
        backlog: number;
    };
    reset(now: number): void;
}
