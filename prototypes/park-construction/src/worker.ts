import { apply, catalogue, initialPark, random, route, type Command, type Park, type Piece } from './model';
let park = initialPark(), last = performance.now(), accumulator = 0;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
function validPiece(q: Piece): boolean {
  return !!q && typeof q.kind==='string' && Object.hasOwn(catalogue,q.kind) && Number.isInteger(q.direction) && q.direction>=0 && q.direction<4 && finite(q.id) && !!q.start && [q.start.x,q.start.y,q.start.z].every(finite) && Math.abs(q.start.x)<=22 && Math.abs(q.start.z)<=22 && q.start.y>=1 && q.start.y<=14;
}
function validSave(v: unknown): v is Park {
  if (!v || typeof v !== 'object') return false;
  const p = v as Park;
  if (p.version !== 1 || ![p.tick, p.time, p.cash, p.speed, p.rng, p.spent, p.earned, p.anchorDirection].every(finite) || ![1, 2, 4].includes(p.speed)) return false;
  if (!['paused', 'parkOpen', 'rideOpen', 'draft'].every(k => typeof p[k as keyof Park] === 'boolean')) return false;
  if (!p.anchor || ![p.anchor.x, p.anchor.y, p.anchor.z].every(finite) || p.anchor.y<1 || p.anchor.y>14 || Math.abs(p.anchor.x)>22 || Math.abs(p.anchor.z)>22 || !Number.isInteger(p.anchorDirection) || p.anchorDirection<0 || p.anchorDirection>3 || p.cash<0 || p.tick<0 || p.time<0) return false;
  if (typeof p.rideName !== 'string' || !Array.isArray(p.archived) || p.archived.length > 255 || !p.archived.every(r=>r && typeof r.name === 'string' && typeof r.open === 'boolean' && Array.isArray(r.pieces) && r.pieces.length>0 && r.pieces.length<=1000 && r.pieces.every(validPiece))) return false;
  if (!Array.isArray(p.pieces) || p.pieces.length > 1000 || !p.pieces.every(validPiece)) return false;
  if (!Array.isArray(p.guests) || p.guests.length > 2000 || !p.guests.every(g => g && [g.x, g.z, g.progress, g.cash, g.hunger].every(finite) && Number.isInteger(g.target) && g.target >= 0 && g.target < route.length && ['walking','shopping','queueing'].includes(g.state))) return false;
  if (!Array.isArray(p.paths) || p.paths.length > 4096 || !p.paths.every(t => t && finite(t.x) && finite(t.z) && typeof t.queue === 'boolean')) return false;
  return !!p.terrain && typeof p.terrain === 'object' && Object.keys(p.terrain).length <= 4096 && Object.entries(p.terrain).every(([key, h]) => /^-?\d+,-?\d+$/.test(key) && finite(h) && h >= 0 && h <= 4);
}
function publish(message = '', command = '') { postMessage({ park, message, command }); }
onmessage = (event: MessageEvent<Command>) => {
  const cmd = event.data;
  let message: string;
  if (cmd.type === 'load') {
    if (validSave(cmd.state)) { park = structuredClone(cmd.state); accumulator = 0; last = performance.now(); message = 'Park restored · construction, time and guest state recovered.'; }
    else message = 'This is not a valid Rivermere prototype park save.';
  } else if (cmd.type === 'reset') { park = initialPark(); accumulator = 0; message = 'Rivermere Park restored to its starting layout.'; }
  else message = apply(park, cmd);
  publish(message, cmd.type);
};
function step() {
  park.tick++; park.time += .025;
  for (let i = 0; i < park.guests.length; i++) {
    const guest = park.guests[i], a = route[guest.target], b = route[(guest.target + 1) % route.length];
    const distance = Math.hypot(a.x - b.x, a.z - b.z);
    guest.hunger = Math.min(1, guest.hunger + .000015);
    guest.progress += .025 * (.35 + (i % 7) * .025) / distance;
    if (guest.progress >= 1) {
      guest.progress -= 1; guest.target = (guest.target + 1) % route.length;
      guest.state = 'walking';
      if (park.parkOpen && guest.hunger > .7 && guest.cash >= 3 && random(park) < .18) {
        guest.cash -= 3; guest.hunger = .12; guest.state = 'shopping'; park.cash += 3; park.earned += 3;
      }
      if (park.rideOpen && guest.target === 6 && random(park) < .3) guest.state = 'queueing';
    }
    const from = route[guest.target], to = route[(guest.target + 1) % route.length];
    guest.x = from.x + (to.x - from.x) * guest.progress + ((i % 5) - 2) * .14;
    guest.z = from.z + (to.z - from.z) * guest.progress + ((i % 3) - 1) * .13;
  }
}
setInterval(() => {
  const now = performance.now(), elapsed = (now - last) / 1000; last = now;
  if (!park.paused) {
    accumulator += elapsed * park.speed;
    let steps = 0;
    while (accumulator >= .025 && steps++ < 200) { step(); accumulator -= .025; }
  }
  publish();
}, 100);
publish('Welcome to Rivermere. Select a tool to shape your park.', 'reset');
