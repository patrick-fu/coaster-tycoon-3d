import * as THREE from 'three';
import { getGuestMaterials } from './guest-appearance.js';

function createRiderMeshGeometry(positions, indices) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildRider(ctx, guestId) {
  const mats = getGuestMaterials(ctx, guestId);
  const root = new THREE.Group();
  root.name = `Rider_${guestId}`;

  const geoTorso = ctx.geometry('carousel:rider:torso', () => createRiderMeshGeometry(
    [
      // Waist (y = -0.21)
      0.13, -0.21, 0.00,
      0.07, -0.21, 0.075,
      -0.07, -0.21, 0.075,
      -0.13, -0.21, 0.00,
      -0.07, -0.21, -0.075,
      0.07, -0.21, -0.075,
      // Mid-Chest (y = +0.06)
      0.15, 0.06, 0.00,
      0.08, 0.06, 0.09,
      -0.08, 0.06, 0.09,
      -0.15, 0.06, 0.00,
      -0.08, 0.06, -0.09,
      0.08, 0.06, -0.09,
      // Shoulders (y = +0.14)
      -0.145, 0.14, 0.035,
      -0.145, 0.14, -0.035,
      0.145, 0.14, -0.035,
      0.145, 0.14, 0.035,
      // Neck collar (y = +0.21)
      0.06, 0.21, 0.05,
      -0.06, 0.21, 0.05,
      -0.06, 0.21, -0.05,
      0.06, 0.21, -0.05,
    ],
    [
      // Bottom waist cap (facing -Y)
      0, 1, 2,  0, 2, 3,  0, 3, 4,  0, 4, 5,
      // Waist to mid-chest loop
      0, 6, 7,  0, 7, 1,
      1, 7, 8,  1, 8, 2,
      2, 8, 9,  2, 9, 3,
      3, 9, 10, 3, 10, 4,
      4, 10, 11, 4, 11, 5,
      5, 11, 6, 5, 6, 0,
      // Upper front chest
      8, 7, 16,  8, 16, 17,
      // Upper back
      11, 10, 18, 11, 18, 19,
      // Left shoulder (sloped and chamfered)
      8, 12, 9,   8, 17, 12,
      9, 12, 13,
      9, 13, 10,  10, 13, 18,
      17, 18, 13, 17, 13, 12,
      // Right shoulder (sloped and chamfered)
      7, 6, 15,   7, 15, 16,
      6, 14, 15,
      6, 11, 14,  11, 19, 14,
      16, 14, 19, 16, 15, 14,
      // Top neck collar cap (facing +Y)
      16, 19, 18, 16, 18, 17,
    ]
  ));
  const geoHead = ctx.geometry('carousel:rider:head', () => new THREE.SphereGeometry(0.11, 10, 8));
  const geoHair = ctx.geometry('carousel:rider:hair', () => createRiderMeshGeometry(
    [
      // Crown top (y = +0.04)
      0.06, 0.04, 0.04,
      -0.06, 0.04, 0.04,
      -0.09, 0.04, -0.03,
      -0.05, 0.04, -0.10,
      0.05, 0.04, -0.10,
      0.09, 0.04, -0.03,
      // Hairline / rim (forehead, temples, nape)
      0.06, 0.015, 0.095,
      -0.06, 0.015, 0.095,
      -0.114, -0.02, 0.03,
      -0.114, -0.038, -0.05,
      0.0, -0.038, -0.114,
      0.114, -0.038, -0.05,
      0.114, -0.02, 0.03,
    ],
    [
      // Crown top cap (facing +Y)
      0, 2, 1,  0, 3, 2,  0, 4, 3,  0, 5, 4,
      // Front slope (forehead / bangs)
      0, 1, 6,  1, 7, 6,
      // Left front slope (left temple)
      1, 2, 8,  1, 8, 7,
      // Left side slope (over-ear)
      2, 3, 9,  2, 9, 8,
      // Left nape slope
      3, 10, 9,
      // Back center slope
      3, 4, 10,
      // Right nape slope
      4, 11, 10,
      // Right side slope (over-ear)
      4, 5, 11,  5, 12, 11,
      // Right front slope (right temple)
      5, 0, 12,  0, 6, 12,
      // Bottom rim seal (facing -Y)
      6, 7, 8,  6, 8, 9,  6, 9, 10,  6, 10, 11,  6, 11, 12,
    ]
  ));
  const geoThigh = ctx.geometry('carousel:rider:thigh', () => new THREE.BoxGeometry(0.11, 0.12, 0.22));
  const geoShin = ctx.geometry('carousel:rider:shin', () => new THREE.BoxGeometry(0.09, 0.22, 0.09));
  const geoBoot = ctx.geometry('carousel:rider:boot', () => new THREE.BoxGeometry(0.09, 0.07, 0.13));
  const geoUpperArm = ctx.geometry('carousel:rider:upperArm', () => new THREE.BoxGeometry(0.07, 0.18, 0.07));
  const geoForearm = ctx.geometry('carousel:rider:forearm', () => new THREE.BoxGeometry(0.065, 0.065, 0.18));

  ctx.add(root, geoTorso, mats.shirt, [0, 0.22, -0.02]);
  ctx.add(root, geoHead, mats.skin, [0, 0.54, 0.00]);
  ctx.add(root, geoHair, mats.hair, [0, 0.59, -0.02]);

  ctx.add(root, geoThigh, mats.pants, [-0.14, 0.04, 0.06], [1, 1, 1], [0.12, -0.15, 0.22]);
  ctx.add(root, geoThigh, mats.pants, [0.14, 0.04, 0.06], [1, 1, 1], [0.12, 0.15, -0.22]);
  ctx.add(root, geoShin, mats.pants, [-0.18, -0.11, 0.10], [1, 1, 1], [-0.1, 0, 0.1]);
  ctx.add(root, geoShin, mats.pants, [0.18, -0.11, 0.10], [1, 1, 1], [-0.1, 0, -0.1]);
  ctx.add(root, geoBoot, mats.boot, [-0.18, -0.23, 0.13]);
  ctx.add(root, geoBoot, mats.boot, [0.18, -0.23, 0.13]);

  ctx.add(root, geoUpperArm, mats.shirt, [-0.16, 0.28, 0.06], [1, 1, 1], [0.45, -0.2, 0.25]);
  ctx.add(root, geoUpperArm, mats.shirt, [0.16, 0.28, 0.06], [1, 1, 1], [0.45, 0.2, -0.25]);
  ctx.add(root, geoForearm, mats.skin, [-0.08, 0.22, 0.18], [1, 1, 1], [0.15, 0.35, 0]);
  ctx.add(root, geoForearm, mats.skin, [0.08, 0.22, 0.18], [1, 1, 1], [0.15, -0.35, 0]);

  return root;
}

export function createCarousels(ctx, assets) {
  const group = new THREE.Group();
  group.name = 'Carousels';

  const instances = new Map();
  let disposed = false;

  function clearAll() {
    for (const inst of instances.values()) {
      for (const rider of inst.riders.values()) {
        rider.removeFromParent();
      }
      inst.riders.clear();
      inst.wrapper.removeFromParent();
    }
    instances.clear();
  }

  function update(packet, elements) {
    if (disposed) return;

    if (!packet || typeof packet !== 'object' ||
        !Array.isArray(packet.carouselSessions) ||
        !Array.isArray(packet.rides) ||
        !Array.isArray(elements)) {
      throw new Error('Invalid carousel packet or elements array schema');
    }

    if (assets?.error) {
      clearAll();
      return;
    }
    if (!assets?.ready) {
      return;
    }
    if (typeof assets.cloneBody !== 'function') {
      throw new Error('assets.cloneBody function is missing while assets are ready');
    }

    const rideMap = new Map();
    for (const r of packet.rides) {
      if (!r || r.id == null) throw new Error('Invalid ride record in packet.rides');
      rideMap.set(r.id, r);
    }

    const bodyMap = new Map();
    for (const el of elements) {
      if (!el || el.kind !== 'fixed-body' || el.id == null) continue;
      bodyMap.set(el.id, el);
    }

    const globalGuestIds = new Set();
    const activeKeys = new Set();

    for (const session of packet.carouselSessions) {
      if (!session || typeof session !== 'object') throw new Error('Invalid session record');

      const ride = rideMap.get(session.ride);
      if (!ride) throw new Error(`Ride ${session.ride} not found in packet.rides`);

      if (!ride.presentation ||
          ride.presentation.kind !== 'detailed-carousel' ||
          ride.presentation.profileId !== 'detailed-carousel-candidate-v1') {
        throw new Error(`Incompatible carousel presentation profile for ride ${session.ride}`);
      }

      if (session.instanceId !== ride.instanceId || session.body !== ride.body) {
        throw new Error(`Session instanceId or body mismatch for ride ${session.ride}`);
      }

      const bodyElem = bodyMap.get(session.body);
      if (!bodyElem || bodyElem.ride !== session.ride) {
        throw new Error(`Fixed-body owner mismatch for ride ${session.ride}`);
      }
      if (!bodyElem.tile || typeof bodyElem.tile.x !== 'number' || typeof bodyElem.tile.y !== 'number' ||
          typeof bodyElem.height !== 'number' || typeof bodyElem.direction !== 'number') {
        throw new Error('Invalid fixed-body element coordinates');
      }

      if (session.angleUnits !== 5760 ||
          typeof session.angle !== 'number' ||
          !Number.isFinite(session.angle) ||
          session.angle < 0 ||
          session.angle >= 5760) {
        throw new Error(`Authoritative rotor angle out of range [0, 5760): ${session.angle}`);
      }

      if (!Array.isArray(session.seats) || session.seats.length !== 16 ||
          !Array.isArray(session.seatIds) || session.seatIds.length !== 16) {
        throw new Error('Session must provide exactly 16 ordered seats and seatIds');
      }

      for (let i = 0; i < 16; i++) {
        const seat = session.seats[i];
        const seatId = session.seatIds[i];
        if (!seat || seat.slot !== i) {
          throw new Error(`Seat slot index mismatch at slot ${i}`);
        }
        if (seat.guest !== seatId) {
          throw new Error(`Seat guest does not match seatIds at slot ${i}`);
        }
        if (seat.guest !== null) {
          if (!Number.isSafeInteger(seat.guest) || seat.guest <= 0) {
            throw new Error(`Guest ID must be positive safe integer at slot ${i}: ${seat.guest}`);
          }
          if (globalGuestIds.has(seat.guest)) {
            throw new Error(`Duplicate rider guest ID detected across sessions: ${seat.guest}`);
          }
          globalGuestIds.add(seat.guest);
        }
      }

      const instKey = session.body;
      activeKeys.add(instKey);

      let inst = instances.get(instKey);
      if (!inst) {
        const wrapper = new THREE.Group();
        wrapper.name = `CarouselWrapper_${session.ride}`;

        const body = assets.cloneBody();
        if (!body) throw new Error('assets.cloneBody returned invalid object');
        wrapper.add(body);

        const rotorRoot = body.getObjectByName('RotorRoot');
        if (!rotorRoot) throw new Error('Authored body is missing required RotorRoot');

        const seatAnchors = [];
        for (let i = 0; i < 16; i++) {
          const seatName = `Seat_${String(i).padStart(2, '0')}`;
          const anchor = rotorRoot.getObjectByName(seatName);
          if (!anchor || anchor.parent !== rotorRoot) throw new Error(`Authored model missing direct rotor anchor ${seatName}`);
          seatAnchors.push(anchor);
        }

        inst = {
          wrapper,
          body,
          rotorRoot,
          seatAnchors,
          riders: new Map(),
          riderCount: 0,
        };
        instances.set(instKey, inst);
        group.add(wrapper);
      }

      const cx = (bodyElem.tile.x + 1.5) * 4;
      const cy = bodyElem.height / 8;
      const cz = (bodyElem.tile.y + 1.5) * 4;
      inst.wrapper.position.set(cx, cy, cz);
      const dir = bodyElem.direction;
      inst.wrapper.rotation.set(0, Math.PI / 2 - dir * (Math.PI / 2), 0);
      inst.wrapper.scale.set(1, 1, 1);

      inst.rotorRoot.rotation.y = (session.angle / 5760) * (Math.PI * 2);

      const rideSelection = { kind: 'ride', id: session.ride };
      inst.wrapper.userData.selection = rideSelection;
      inst.body.traverse(child => {
        if (!child.userData.isRider) {
          child.userData.selection = rideSelection;
        }
      });

      let currentRiders = 0;
      for (let i = 0; i < 16; i++) {
        const guestId = session.seats[i].guest;
        const existingRider = inst.riders.get(i);

        if (guestId == null) {
          if (existingRider) {
            existingRider.removeFromParent();
            inst.riders.delete(i);
          }
        } else {
          currentRiders++;
          if (existingRider && existingRider.userData.guestId === guestId) {
            const guestSelection = { kind: 'guest', id: guestId };
            existingRider.userData.selection = guestSelection;
            existingRider.traverse(c => { c.userData.selection = guestSelection; });
          } else {
            if (existingRider) {
              existingRider.removeFromParent();
              inst.riders.delete(i);
            }
            const rider = buildRider(ctx, guestId);
            rider.userData.isRider = true;
            rider.userData.guestId = guestId;
            const guestSelection = { kind: 'guest', id: guestId };
            rider.userData.selection = guestSelection;
            rider.traverse(c => { c.userData.selection = guestSelection; });

            inst.seatAnchors[i].add(rider);
            inst.riders.set(i, rider);
          }
        }
      }
      inst.riderCount = currentRiders;
    }

    for (const [key, inst] of instances.entries()) {
      if (!activeKeys.has(key)) {
        for (const rider of inst.riders.values()) {
          rider.removeFromParent();
        }
        inst.riders.clear();
        inst.wrapper.removeFromParent();
        instances.delete(key);
      }
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    clearAll();
  }

  function status() {
    let realRiders = 0;
    for (const inst of instances.values()) {
      realRiders += inst.riderCount;
    }
    return {
      records: instances.size,
      realRiders,
      disposed,
    };
  }

  return {
    group,
    update,
    dispose,
    status,
  };
}
