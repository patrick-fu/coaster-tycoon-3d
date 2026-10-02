export type Vec = { x: number; y: number; z: number };
export type PieceKind = 'station' | 'straight' | 'lift' | 'down' | 'left' | 'right' | 'bank' | 'brake' | 'loop';
export type Piece = { kind: PieceKind; start: Vec; direction: number; id: number };
export type PathTile = { x: number; z: number; queue: boolean };
export type Guest = { x: number; z: number; target: number; progress: number; cash: number; hunger: number; state: 'walking' | 'shopping' | 'queueing' };
export type StoredRide = { name: string; pieces: Piece[]; open: boolean };
export type Park = { version: 1; tick: number; time: number; cash: number; speed: number; paused: boolean; parkOpen: boolean; rideOpen: boolean; rideName: string; archived: StoredRide[]; rng: number; pieces: Piece[]; draft: boolean; anchor: Vec; anchorDirection: number; paths: PathTile[]; terrain: Record<string, number>; guests: Guest[]; spent: number; earned: number };
export type Command = { type: 'place'; kind: PieceKind } | { type: 'undo' | 'new' | 'edit' | 'pause' | 'park' | 'ride' | 'reset' } | { type: 'height' | 'speed' | 'select'; value: number } | { type: 'anchor'; x: number; z: number; direction: number } | { type: 'path'; x: number; z: number; queue: boolean } | { type: 'terrain'; x: number; z: number; delta: number } | { type: 'load'; state: unknown };
export const catalogue: Record<PieceKind, { name: string; cost: number; glyph: string; detail: string }> = {
  station: { name: 'Station', cost: 320, glyph: '▤', detail: 'Boarding platform' },
  straight: { name: 'Straight', cost: 90, glyph: '↑', detail: 'Level track · 8 m' },
  lift: { name: 'Chain lift', cost: 160, glyph: '↗', detail: 'Climb · +4 m' },
  down: { name: 'Descent', cost: 100, glyph: '↘', detail: 'Drop · −4 m' },
  left: { name: 'Left turn', cost: 140, glyph: '↰', detail: 'Quarter turn · 8 m radius' },
  right: { name: 'Right turn', cost: 140, glyph: '↱', detail: 'Quarter turn · 8 m radius' },
  bank: { name: 'Banked turn', cost: 180, glyph: '⤴', detail: 'Banked right · 18°' },
  brake: { name: 'Brakes', cost: 150, glyph: '═', detail: 'Controlled brake section' },
  loop: { name: 'Vertical loop', cost: 480, glyph: '↻', detail: 'Inversion · 24 m rise' },
};
export function point(piece: Piece, t: number): Vec {
  let x = 0, y = 0, z = -2 * t;
  const { kind, direction, start } = piece;
  if (kind === 'left' || kind === 'right' || kind === 'bank') {
    const a = t * Math.PI / 2, sign = kind === 'left' ? -1 : 1;
    x = sign * 2 * (1 - Math.cos(a)); z = -2 * Math.sin(a);
  }
  if (kind === 'lift' || kind === 'down') y = (kind === 'lift' ? 1 : -1) * (t * t * (3 - 2 * t));
  if (kind === 'loop') { z = -(4 * t + 1.5 * Math.sin(t * Math.PI * 2)); y = 3 * (1 - Math.cos(t * Math.PI * 2)); }
  const a = direction * Math.PI / 2;
  return { x: start.x + x * Math.cos(a) - z * Math.sin(a), y: start.y + y, z: start.z + x * Math.sin(a) + z * Math.cos(a) };
}
export function endDirection(piece: Piece): number { return (piece.direction + (piece.kind === 'left' ? -1 : piece.kind === 'right' || piece.kind === 'bank' ? 1 : 0) + 4) % 4; }
export function endpoint(park: Park): { start: Vec; direction: number } {
  const last = park.pieces.at(-1);
  return last ? { start: point(last, 1), direction: endDirection(last) } : { start: { ...park.anchor }, direction: park.anchorDirection };
}
export function isClosed(park: Park): boolean {
  if (park.pieces.length < 4) return false;
  const first = park.pieces[0], last = endpoint(park);
  return Math.hypot(first.start.x - last.start.x, first.start.y - last.start.y, first.start.z - last.start.z) < .01 && first.direction === last.direction;
}
export function candidate(park: Park, kind: PieceKind): Piece { return { kind, ...endpoint(park), id: park.tick + park.pieces.length + 1 }; }
function surfaceError(park: Park, piece: Piece): string | null {
  for(let j=0;j<=20;j++){
    const p=point(piece,j/20),land=park.terrain[`${Math.round(p.x)},${Math.round(p.z)}`]||0;
    if(Math.abs(p.x)>22||Math.abs(p.z)>22)return 'Outside the construction area.';
    if(p.y>14)return 'Track exceeds the prototype height limit of 56 m.';
    if(p.y<land+.55)return 'Track is too close to the ground. Raise the base or add a lift.';
    if([[7,-12],[17,10],[17,4],[-17,0]].some(([x,z])=>Math.abs(p.x-x)<1.4&&Math.abs(p.z-z)<1.4&&p.y<2.8))return 'Track is obstructed by a shop building.';
    if((p.x-11)**2/10+(p.z-5)**2/18<1&&p.y<2)return 'Insufficient clearance above the lake.';
  }
  return null;
}
export function validate(park: Park, piece: Piece): string | null {
  if (park.cash < catalogue[piece.kind].cost) return 'Not enough funds for this section.';
  if (park.pieces.length && isClosed(park)) return 'The circuit is closed. Remove the final section before extending it.';
  if (!park.pieces.length && piece.kind !== 'station') return 'Start your coaster with a station.';
  const obstacle=surfaceError(park,piece);if(obstacle)return obstacle;
  const finish=point(piece,1),first=park.pieces[0];
  const closing=first&&Math.hypot(finish.x-first.start.x,finish.y-first.start.y,finish.z-first.start.z)<.01&&endDirection(piece)===first.direction;
  for (let j = 2; j <= 20; j++) {
    const p = point(piece, j / 20);
    for (const old of [...park.pieces.slice(0, -1), ...park.archived.flatMap(r => r.pieces)]) {
      for (let k = 0; k <= 16; k++) {
        const q = point(old, k / 16);
        if (closing && old===first && Math.hypot(p.x-finish.x,p.y-finish.y,p.z-finish.z)<.6 && Math.hypot(q.x-first.start.x,q.y-first.start.y,q.z-first.start.z)<.6) continue;
        if (Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < .46) return 'Track intersects an existing section.';
      }
    }
  }
  return null;
}
export const route: Vec[] = [
  { x: 5, y: 0, z: 18 }, { x: 5, y: 0, z: 11 }, { x: 5, y: 0, z: 2 }, { x: 5, y: 0, z: -8 },
  { x: -5, y: 0, z: -8 }, { x: -14, y: 0, z: -8 }, { x: -14, y: 0, z: 3 }, { x: -14, y: 0, z: 13 },
  { x: -5, y: 0, z: 13 }, { x: 5, y: 0, z: 13 }, { x: 13, y: 0, z: 13 }, { x: 17, y: 0, z: 13 },
  { x: 17, y: 0, z: -1 }, { x: 5, y: 0, z: -1 },
];
export function random(park: Park): number { park.rng = (Math.imul(park.rng, 1664525) + 1013904223) >>> 0; return park.rng / 4294967296; }
export function initialPark(): Park {
  const park: Park = { version: 1, tick: 0, time: 0, cash: 24850, speed: 1, paused: false, parkOpen: true, rideOpen: true, rideName: 'Lake Runner', archived: [], rng: 42017, pieces: [], draft: false, anchor: { x: -10, y: 2, z: 8 }, anchorDirection: 0, paths: [], terrain: {}, guests: [], spent: 0, earned: 0 };
  const kinds: PieceKind[] = ['station', 'straight', 'lift', 'lift', 'down', 'down', 'right', 'straight', 'loop', 'brake', 'right', 'straight', 'lift', 'straight', 'straight', 'down', 'straight', 'right', 'straight', 'brake', 'straight', 'straight', 'right'];
  for (const kind of kinds) park.pieces.push(candidate(park, kind));
  for (let i = 0; i < 420; i++) {
    const target = Math.floor(random(park) * route.length), a = route[target], b = route[(target + 1) % route.length], progress = random(park);
    park.guests.push({ x: a.x + (b.x - a.x) * progress, z: a.z + (b.z - a.z) * progress, target, progress, cash: 25 + Math.floor(random(park) * 50), hunger: random(park), state: 'walking' });
  }
  return park;
}
export function apply(park: Park, command: Command): string {
  switch (command.type) {
    case 'place': {
      const piece = candidate(park, command.kind), error = validate(park, piece);
      if (error) return error;
      park.pieces.push(piece); park.cash -= catalogue[piece.kind].cost; park.spent += catalogue[piece.kind].cost;
      return `${catalogue[piece.kind].name} placed · £${catalogue[piece.kind].cost}`;
    }
    case 'undo': { const old = park.pieces.pop(); if (old) { park.cash += catalogue[old.kind].cost; park.spent -= catalogue[old.kind].cost; park.rideOpen = false; return 'Last section removed · full prototype refund'; } return 'No sections to remove.'; }
    case 'new': if(park.archived.length>=254&&park.pieces.length)return 'Ride-instance limit reached.'; if (park.pieces.length) park.archived.push({ name: park.rideName, pieces: park.pieces, open: park.rideOpen }); park.pieces = []; park.rideName = `Coaster ${park.archived.length + 1}`; park.draft = true; park.rideOpen = false; park.anchor = { x: 9, y: 2, z: -4 }; park.anchorDirection = 0; return 'Choose a station, then build from its endpoint.';
    case 'select': {
      const index = command.value, ride = park.archived[index]; if (!ride) return 'Ride not found.';
      park.archived.splice(index,1); if (park.pieces.length) park.archived.push({ name: park.rideName, pieces: park.pieces, open: park.rideOpen });
      park.pieces = ride.pieces; park.rideName = ride.name; park.rideOpen = ride.open; park.anchor={...ride.pieces[0].start};park.anchorDirection=ride.pieces[0].direction;park.draft = !isClosed(park); return `${ride.name} selected.`;
    }
    case 'edit': park.rideOpen = false; return isClosed(park)?'Ride closed for editing. Undo the final section to extend the circuit.':'Construction mode · continue from the highlighted endpoint.';
    case 'height': {
      if (park.rideOpen) return 'Close the ride before changing its base height.';
      const change = command.value, min = park.pieces.length ? Math.min(...park.pieces.map(p => Math.min(point(p, 0).y, point(p, 1).y))) : park.anchor.y;
      if (min + change < 1 || min + change > 14) return 'Base height must stay between 1 and 14 m.';
      const moved=park.pieces.map(p=>({...p,start:{...p.start,y:p.start.y+change}}));
      for(const piece of moved){const error=surfaceError(park,piece);if(error)return error;
        for(let j=0;j<=20;j++){const p=point(piece,j/20);for(const ride of park.archived)for(const other of ride.pieces)for(let k=0;k<=16;k++){const q=point(other,k/16);if(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<.46)return 'Height change would intersect another coaster.';}}
      }
      park.anchor.y += change; for (const p of park.pieces) p.start.y += change;
      return 'Coaster base height changed.';
    }
    case 'anchor': if (park.pieces.length) return 'Station already placed. Start a new coaster to choose another location.'; park.anchor.x = Math.round(command.x); park.anchor.z = Math.round(command.z); park.anchorDirection = command.direction % 4; return 'Station position updated.';
    case 'speed': park.speed = command.value; return `Simulation speed · ${command.value}×`;
    case 'pause': park.paused = !park.paused; return park.paused ? 'Park paused.' : 'Park resumed.';
    case 'park': park.parkOpen = !park.parkOpen; return park.parkOpen ? 'Park opened.' : 'Park closed.';
    case 'ride': if (!isClosed(park)) return 'Complete a connected circuit before opening the ride.'; park.rideOpen = !park.rideOpen; return park.rideOpen ? 'Circuit opened for the ride preview.' : 'Ride closed.';
    case 'path': {
      const x = Math.round(command.x), z = Math.round(command.z);
      if (Math.abs(x) > 22 || Math.abs(z) > 22) return 'Outside the park.';
      if (park.paths.some(p => p.x === x && p.z === z)) return 'A path already occupies this tile.';
      if (park.cash < 12) return 'Not enough funds for a path tile.';
      park.paths.push({ x, z, queue: command.queue }); park.cash -= 12; park.spent += 12; return command.queue ? 'Queue tile placed.' : 'Path tile placed.';
    }
    case 'terrain': {
      const key = `${Math.round(command.x)},${Math.round(command.z)}`, next = (park.terrain[key] || 0) + command.delta;
      if (Math.abs(command.x) > 22 || Math.abs(command.z) > 22 || next < 0 || next > 4) return 'Terrain height outside the prototype range.';
      if (park.cash < 15) return 'Not enough funds for terrain editing.';
      const x = Math.round(command.x), z = Math.round(command.z);
      for (const p of [...park.pieces,...park.archived.flatMap(r=>r.pieces)]) for (let j = 0; j <= 20; j++) { const q = point(p, j / 20); if (Math.hypot(q.x - x, q.z - z) < .8 && next + .55 > q.y) return 'Terrain would obstruct existing track.'; }
      park.terrain[key] = next; park.cash -= 15; park.spent += 15; return 'Terrain tile reshaped.';
    }
    case 'reset': return 'Use a fresh park to reset the prototype.';
    case 'load': return 'Save loading is handled at the worker boundary.';
  }
}
