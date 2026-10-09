import { carPose } from './motion.js';
import { ensure, integer, record } from './validation.js';
import { endpoint } from './geometry.js';
import { resolveContent } from '../content/registry.js';
import { WORKER_PROTOCOL_VERSION } from './protocol.js';
import { resolveRideRules, woodenProfile } from '../content/ride-profiles.js';
import { woodenTrainPoses } from './wooden-motion.js';
import { carouselAngle, carouselSeatFrame, fixedProfile } from './carousel.js';
import { flumeProfile } from './flume-profile.js';
import { flumeGroundCells } from './flume-native.js';
import { boatFrame, boatSeatFrames } from './boat.js';
export function validateView(value, side) {
    record(value, ['bounds', 'includeStatic']);
    record(value.bounds, ['x0', 'y0', 'x1', 'y1']);
    const b = value.bounds;
    ensure(typeof value.includeStatic === 'boolean' && [b.x0, b.y0, b.x1, b.y1].every(n => integer(n, 0, side - 1)) && Number(b.x1) >= Number(b.x0) && Number(b.y1) >= Number(b.y0) && Number(b.x1) - Number(b.x0) < 64 && Number(b.y1) - Number(b.y0) < 64, 'INVALID_COMMAND', 'Invalid or oversized view bounds.');
    return value;
}
export function project(s, rules, request, elements, course, channelCourse) {
    const b = request.bounds, visible = (x, y) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1, metres = rules.motion.tileMetres;
    const phases = ['walking', 'queued', 'riding', 'stranded', 'leaving', 'buying', 'resting'];
    const people = [];
    for (const g of s.people.guests) {
        if (g.phase === 'riding')
            continue;
        const mix = g.next ? g.walkProgress / rules.guests.walkTicks : 0, x = g.point.x + (g.next ? g.next.x - g.point.x : 0) * mix, y = g.point.y + (g.next ? g.next.y - g.point.y : 0) * mix;
        if (visible(x, y))
            people.push(g.id, x * metres, y * metres, g.point.z / 32 * metres, phases.indexOf(g.phase), 0);
    }
    for (const t of s.staff) {
        const mix = t.next ? t.progress / rules.services.staffWalkTicks : 0, x = t.point.x + (t.next ? t.next.x - t.point.x : 0) * mix, y = t.point.y + (t.next ? t.next.y - t.point.y : 0) * mix;
        if (visible(x, y))
            people.push(t.id, x * metres, y * metres, t.point.z / 32 * metres, t.role === 'mechanic' ? 0 : 1, 1);
    }
    const metreFrame = (frame) => ({ position: { x: frame.position.x / 1000, y: frame.position.y / 1000, z: frame.position.z / 1000 }, direction: { ...frame.direction }, up: { ...frame.up } });
    const cars = [];
    for (const t of s.trains) {
        const ride = s.rides.find(r => r.id === t.ride), selected = resolveRideRules(ride.content, rules), profile = woodenProfile(ride.content, rules), c = course(t.ride), frames = profile ? woodenTrainPoses(t, c, profile) : null;
        for (let i = 0; i < t.carIds.length; i++) {
            const pose = frames ? frames[i].body : carPose(c, t.position - i * selected.motion.carLength), seatIds = t.seats.slice(i * selected.motion.seatsPerCar, (i + 1) * selected.motion.seatsPerCar);
            if (visible(pose.position.x / 1000 / metres, pose.position.y / 1000 / metres))
                cars.push({ id: t.carIds[i], ride: t.ride, ...metreFrame(pose), occupants: seatIds.filter(id => id !== null).length, seatIds, rig: frames ? { kind: 'wooden-coupled-flat', bogieFront: metreFrame(frames[i].bogieFront), bogieRear: metreFrame(frames[i].bogieRear), link: frames[i].link ? metreFrame(frames[i].link) : null, restraintsClosed: t.phase === 'running' || t.phase === 'stalled' && seatIds.some(id => id !== null) } : null });
        }
    }
    const rides = s.rides.map(r => {
        if (r.body !== undefined) {
            const p = fixedProfile(r.content, rules);
            return { id: r.id, instanceId: r.instanceId, content: { ...r.content }, presentation: resolveContent(r.content).capabilities.presentation, name: r.name, status: r.status, price: r.price, income: r.income, broken: r.broken, queue: r.queue.length, body: r.body, anchor: { ...r.anchor }, capacity: p.seats.length, sessionPhase: s.carouselSessions.find(t => t.ride === r.id).phase };
        }
        const selected = resolveRideRules(r.content, rules), channel = flumeProfile(r.content, rules), profile = woodenProfile(r.content, rules), end = r.track.at(-1), e = end === undefined ? undefined : elements.get(end);
        const tip = e?.kind === 'track' ? endpoint(e.origin, selected.pieces[e.piece]) : r.anchor;
        if (channel) {
            const boat = s.boats.find(b => b.ride === r.id);
            return { id: r.id, instanceId: r.instanceId, content: { ...r.content }, presentation: resolveContent(r.content).capabilities.presentation, channelProfile: structuredClone(channel), name: r.name, status: r.status, price: r.price, income: r.income, broken: r.broken, queue: r.queue.length, tip: { ...tip }, trackCount: r.track.length, capacity: 4, measured: boat?.measured ? { ...boat.measured } : null, boatPhase: boat?.phase ?? null };
        }
        const t = s.trains.find(t => t.ride === r.id);
        return { id: r.id, instanceId: r.instanceId, content: { ...r.content }, presentation: resolveContent(r.content).capabilities.presentation, trackProfile: profile ? structuredClone(profile) : null, name: r.name, status: r.status, cars: r.cars, price: r.price, income: r.income, broken: r.broken, queue: r.queue.length, tip: { ...tip }, trackCount: r.track.length, measured: t?.measured ? { ...t.measured } : null, trainPhase: t?.phase ?? null };
    });
    const carouselSessions = s.carouselSessions.flatMap(session => {
        const ride = s.rides.find(r => r.id === session.ride), body = ride.body === undefined ? undefined : elements.get(ride.body);
        if (body?.kind !== 'fixed-body' || body.tile.x + 2 < b.x0 || body.tile.x > b.x1 || body.tile.y + 2 < b.y0 || body.tile.y > b.y1)
            return [];
        const p = fixedProfile(ride.content, rules), angle = carouselAngle(session, p);
        return [{ ride: ride.id, instanceId: ride.instanceId, body: body.id, phase: session.phase, phaseTick: session.phaseTick, completedCycles: session.completedCycles, angle, angleUnits: p.angleUnits, seatIds: [...session.seats], seats: p.seats.map((seat, slot) => ({ slot, guest: session.seats[slot], ...carouselSeatFrame(body, seat, angle, p) })) }];
    });
    const boats = s.boats.flatMap(boat => {
        const ride = s.rides.find(r => r.id === boat.ride), p = flumeProfile(ride.content, rules).vehicle, c = channelCourse(boat.ride), frame = boatFrame(boat, c, p);
        if (!visible(frame.position.x / 1000 / metres, frame.position.y / 1000 / metres))
            return [];
        return [{ id: boat.id, ride: boat.ride, instanceId: ride.instanceId, phase: boat.phase, mode: boat.mode, ...metreFrame(frame), seatIds: [...boat.seats], seats: boatSeatFrames(boat, c, p).map((seat, slot) => ({ slot, guest: boat.seats[slot], ...metreFrame(seat) })) }];
    });
    let scenery = null;
    if (request.includeStatic) {
        const surfaces = [];
        for (let y = b.y0; y <= b.y1; y++)
            for (let x = b.x0; x <= b.x1; x++) {
                const i = y * 256 + x;
                surfaces.push(x, y, s.terrain[i], s.water[i], s.owned[i] ? 1 : 0);
            }
        const found = s.elements.filter(e => { if (e.kind === 'track' && flumeProfile(s.rides.find(r => r.id === e.ride).content, rules))
            return flumeGroundCells(e, c => ({ height: s.terrain[c.y * 256 + c.x], water: s.water[c.y * 256 + c.x], owned: s.owned[c.y * 256 + c.x] }), rules.maxHeight).some(c => visible(c.x, c.y)); const x = e.kind === 'track' ? e.origin.x / 32 : e.tile.x, y = e.kind === 'track' ? e.origin.y / 32 : e.tile.y; return e.kind === 'fixed-body' ? x + 2 >= b.x0 && x <= b.x1 && y + 2 >= b.y0 && y <= b.y1 : visible(x, y); });
        const bodies = found.filter(e => e.kind === 'fixed-body'), remaining = found.filter(e => e.kind !== 'fixed-body');
        scenery = { elements: structuredClone([...bodies, ...remaining.slice(0, 8192 - bodies.length)]), surfaces, truncated: found.length > 8192 };
    }
    return { protocolVersion: WORKER_PROTOCOL_VERSION, contentVersion: s.contentVersion, coordinates: { nativeUnitsPerTile: 32, nativeHeightStep: 8, nativeLandStep: 16, metresPerTile: rules.motion.tileMetres, evidence: 'project-candidate' }, revision: `${s.revision}:${s.tick}`, worldRevision: s.revision, topologyRevision: s.topologyRevision, tick: s.tick, paused: s.paused, parkOpen: s.people.open, cash: s.cash, loan: s.loan, maxLoan: s.maxLoan, side: s.side, entry: s.people.entry ? { ...s.people.entry } : null, ledger: { ...s.ledger }, counts: { guests: s.people.guests.length, staff: s.staff.length, litter: s.litter.length, cars: s.trains.reduce((n, t) => n + t.carIds.length, 0), boats: s.boats.length }, people: new Float64Array(people), cars, carouselSessions, boats, rides, staff: s.staff.map(t => ({ id: t.id, role: t.role, work: t.job?.kind ?? t.cleanup?.kind ?? null, completed: t.completed })), facilities: s.facilities.map(f => ({ ...f, content: { ...f.content }, presentation: resolveContent(f.content).capabilities.presentation })), amenities: s.amenities.map(a => ({ ...a })), litter: new Float64Array(s.litter.filter(l => visible(l.point.x, l.point.y)).flatMap(l => [l.id, l.point.x * metres, l.point.y * metres, l.point.z / 32 * metres])), scenery };
}
