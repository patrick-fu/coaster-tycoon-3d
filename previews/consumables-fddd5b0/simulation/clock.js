import { ensure } from './validation.js';
export class FixedClock {
    hz;
    balance = 0;
    last;
    speed = 1;
    constructor(hz, now) {
        this.hz = hz;
        this.last = now;
    }
    poll(now, paused, maxTicks = 40) {
        ensure(Number.isFinite(now) && now >= this.last, 'INVALID_COMMAND', 'Invalid monotonic time.');
        const elapsed = now - this.last;
        this.last = now;
        if (!paused)
            this.balance += elapsed * this.hz * this.speed / 1000;
        ensure(Number.isSafeInteger(Math.floor(this.balance)), 'CAPACITY', 'Clock backlog exhausted.');
        const ticks = paused ? 0 : Math.min(maxTicks, Math.floor(this.balance));
        this.balance -= ticks;
        return { ticks, backlog: Math.floor(this.balance) };
    }
    reset(now) { this.last = now; this.balance = 0; }
}
