import { LIMITS } from './types.js';
import { ensure, integer } from './validation.js';
import { flumeCandidate } from '../content/log-flume.js';
import { flumeCourseFrame } from './flume-native.js';
const measurements = () => ({ ticks: 0, distance: 0, maxSpeed: 0 });
const towards = (speed, target, acceleration, brake) => speed < target ? Math.min(target, speed + acceleration) : Math.max(target, speed - brake);
export function createBoat(id, ride, course) {
    ensure(integer(id, 1) && integer(ride, 0, LIMITS.rideSlots - 1), 'INVALID_COMMAND', 'Invalid boat or ride identifier.');
    return { id, ride, seats: Array(4).fill(null), phase: 'loading', position: course.dock, travelled: 0, speed: 0, wait: 0, laps: 0, docking: false, mode: null, stats: measurements(), measured: null };
}
export function boatEditable(boat, course) { return boat.phase === 'loading' && boat.seats.every(id => id === null) && boat.position === course.dock && boat.speed === 0; }
export function boatQualified(boat, course, p = flumeCandidate) { return boat.measured !== null && boat.measured.courseKey === course.key && boat.measured.ticks > 0 && boat.measured.distance === course.length && boat.measured.maxSpeed <= p.maxSpeed; }
export function stepBoat(boat, course, p, dispatch) {
    if (boat.phase === 'unloading') {
        boat.wait = Math.min(p.unloadTicks, boat.wait + 1);
        return;
    }
    let phase = boat.phase, mode = boat.mode, wait = boat.wait, speed = boat.speed, travelled = boat.travelled, docking = boat.docking, stats = boat.stats, measured = boat.measured;
    if (phase === 'loading') {
        if (dispatch === null) {
            if (boat.seats.every(id => id === null))
                boat.wait = 0;
            return;
        }
        const occupied = boat.seats.some(id => id !== null);
        ensure(dispatch === 'testing' ? !occupied : occupied, 'OPERATING_REQUIREMENTS', 'Testing requires an empty boat; paid dispatch requires occupants.');
        ensure(integer(wait + 1), 'CAPACITY', 'Boat loading clock capacity exhausted.');
        wait++;
        if (dispatch === 'testing')
            measured = null;
        if (wait < p.minLoadTicks || wait < p.maxLoadTicks && dispatch !== 'testing' && boat.seats.includes(null)) {
            boat.wait = wait;
            boat.measured = measured;
            return;
        }
        phase = 'running';
        mode = dispatch;
        wait = 0;
        travelled = 0;
        speed = p.channelSpeed;
        docking = false;
        stats = measurements();
    }
    const frame = flumeCourseFrame(course, boat.position), remaining = course.length - travelled;
    if (frame.piece === 'station' && remaining <= speed * (speed + 1) / 2)
        docking = true;
    if (docking)
        speed = Math.max(1, speed - p.channelBrake);
    else if (frame.piece.startsWith('lift'))
        speed = towards(speed, p.liftSpeed, p.acceleration, p.liftBrake);
    else if (frame.piece.startsWith('drop'))
        speed = Math.max(1, speed - Math.round(p.gravity * frame.direction.z / (p.tickHz * p.tickHz)));
    else
        speed = towards(speed, p.channelSpeed, p.acceleration, frame.piece === 'splash' ? p.splashBrake : p.channelBrake);
    ensure(integer(speed, 1, 1000000000), 'CAPACITY', 'Boat speed exceeds the supported numeric range.');
    const distance = Math.min(speed, remaining), finishing = travelled + distance === course.length, laps = boat.laps + (finishing ? 1 : 0);
    ensure(integer(distance, 1) && integer(boat.position + distance) && integer(stats.ticks + 1) && integer(stats.distance + distance) && integer(laps), 'CAPACITY', 'Boat movement capacity exhausted.');
    stats = { ticks: stats.ticks + 1, distance: stats.distance + distance, maxSpeed: Math.max(stats.maxSpeed, speed) };
    travelled += distance;
    let position = (boat.position + distance) % course.length;
    if (finishing) {
        if (mode === 'testing')
            measured = stats.maxSpeed <= p.maxSpeed ? { ...stats, courseKey: course.key } : null;
        position = course.dock;
        phase = 'unloading';
        speed = 0;
        wait = 0;
    }
    Object.assign(boat, { phase, mode, wait, speed, travelled, docking, stats, measured, position, laps });
}
export function finishBoatUnloading(boat, course, p = flumeCandidate) {
    ensure(boat.phase === 'unloading' && boat.wait === p.unloadTicks && boat.position === course.dock && boat.speed === 0 && boat.seats.every(id => id === null), 'OPERATING_REQUIREMENTS', 'Boat unloading requires its exact dock, complete wait and transferred owners.');
    boat.phase = 'loading';
    boat.wait = 0;
    boat.mode = null;
    boat.docking = false;
}
export function boatFrame(boat, course, p = flumeCandidate) {
    const frame = flumeCourseFrame(course, boat.position);
    return { ...frame, position: { x: frame.position.x + frame.up.x * p.waterMm, y: frame.position.y + frame.up.y * p.waterMm, z: frame.position.z + frame.up.z * p.waterMm } };
}
export function boatSeatFrames(boat, course, p = flumeCandidate) {
    const body = boatFrame(boat, course, p), f = body.direction, u = body.up, right = { x: f.y * u.z - f.z * u.y, y: f.z * u.x - f.x * u.z, z: f.x * u.y - f.y * u.x };
    return p.seats.map((s, slot) => ({ slot, position: { x: body.position.x + right.x * s.x + u.x * s.y + f.x * s.z, y: body.position.y + right.y * s.x + u.y * s.y + f.y * s.z, z: body.position.z + right.z * s.x + u.z * s.y + f.z * s.z }, direction: { ...f }, up: { ...u } }));
}
