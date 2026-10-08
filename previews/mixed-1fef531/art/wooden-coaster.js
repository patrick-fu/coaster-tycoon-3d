import * as THREE from 'three';
import { portalMountYaw, woodenTransition } from '../simulation/wooden-placement.js';

/**
 * Coordinate and Basis Helpers
 * Simulation public frames: metres in (x, y ground, z up).
 * Three.js coordinate system: (x, z, y) where Three-Y is Up.
 */
function simToThree(v) {
  return new THREE.Vector3(v.x, v.z, v.y);
}

function makeBasisMatrix(forward, up, position) {
  const f = forward.clone().normalize();
  const u = up.clone().normalize();
  const r = new THREE.Vector3().crossVectors(u, f).normalize();
  return new THREE.Matrix4().makeBasis(r, u, f).setPosition(position);
}

const DIRECTIONS = [
  [1, 0],   // Dir 0: +X
  [0, 1],   // Dir 1: +Y (Three +Z)
  [-1, 0],  // Dir 2: -X
  [0, -1],  // Dir 3: -Y (Three -Z)
];

const NATIVE_DIRECTIONS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 0, -1),
];

const SEAT_NODE_NAMES = [
  'Seat_FrontLeft',
  'Seat_FrontRight',
  'Seat_RearLeft',
  'Seat_RearRight',
];

const LAP_BAR_OPEN_ROTATION_X = Math.PI * 0.25;

// Finite deterministic adult guest color palettes keyed by guest ID
const SHIRT_PALETTE = ['#2b5c8f', '#a13333', '#2d7a4d', '#c27d2b', '#6b4c82', '#9c3a6e', '#2c757a', '#637a28'];
const PANTS_PALETTE = ['#232b38', '#383d47', '#4b5563', '#1e293b', '#2e3828', '#4a382a', '#1f2937', '#334155'];
const SKIN_PALETTE = ['#f7d5b2', '#edd0be', '#e0b594', '#d49b74', '#b87b52', '#8c5332', '#63371f', '#452615'];
const HAIR_PALETTE = ['#1a1818', '#38251a', '#573822', '#8c592b', '#bfa054', '#615f5c', '#212124', '#7a311e'];

function getGuestMaterials(ctx, guestId) {
  const seed = Math.abs(guestId);
  const shirtHex = SHIRT_PALETTE[seed % SHIRT_PALETTE.length];
  const pantsHex = PANTS_PALETTE[(seed * 7) % PANTS_PALETTE.length];
  const skinHex = SKIN_PALETTE[(seed * 13) % SKIN_PALETTE.length];
  const hairHex = HAIR_PALETTE[(seed * 31) % HAIR_PALETTE.length];

  return {
    shirt: ctx.material(`wooden:passenger:shirt:${shirtHex}`, { color: shirtHex, roughness: 0.8 }),
    pants: ctx.material(`wooden:passenger:pants:${pantsHex}`, { color: pantsHex, roughness: 0.85 }),
    skin: ctx.material(`wooden:passenger:skin:${skinHex}`, { color: skinHex, roughness: 0.6 }),
    hair: ctx.material(`wooden:passenger:hair:${hairHex}`, { color: hairHex, roughness: 0.9 }),
  };
}

function buildSeatedGuest(ctx, guestId) {
  const mats = getGuestMaterials(ctx, guestId);
  const root = new THREE.Group();
  root.name = `Passenger_${guestId}`;

  // Proportioned adult seated human silhouettes in canonical Three-basis (+Y up, +Z front)
  // Torso: 0.32 wide x 0.44 high x 0.18 deep
  // Head: radius 0.11
  // Arms: within 0.38 lateral span (<= 0.50m limit)
  const geoTorso = ctx.geometry('wooden:passenger:torso', () => new THREE.BoxGeometry(0.32, 0.44, 0.18));
  const geoHead = ctx.geometry('wooden:passenger:head', () => new THREE.SphereGeometry(0.11, 10, 8));
  const geoHair = ctx.geometry('wooden:passenger:hair', () => new THREE.BoxGeometry(0.23, 0.08, 0.23));
  const geoThigh = ctx.geometry('wooden:passenger:thigh', () => new THREE.BoxGeometry(0.11, 0.11, 0.24));
  const geoShin = ctx.geometry('wooden:passenger:shin', () => new THREE.BoxGeometry(0.08, 0.24, 0.08));
  const geoFoot = ctx.geometry('wooden:passenger:foot', () => new THREE.BoxGeometry(0.09, 0.06, 0.10));
  const geoUpperArm = ctx.geometry('wooden:passenger:upperArm', () => new THREE.BoxGeometry(0.07, 0.22, 0.07));
  const geoForearm = ctx.geometry('wooden:passenger:forearm', () => new THREE.BoxGeometry(0.065, 0.065, 0.20));

  // Torso centered above hips, backrest alignment
  ctx.add(root, geoTorso, mats.shirt, [0, 0.22, -0.04]);

  // Head and Hair
  ctx.add(root, geoHead, mats.skin, [0, 0.55, -0.02]);
  ctx.add(root, geoHair, mats.hair, [0, 0.60, -0.03]);

  // The actual floor is at .30m and the front bulkhead begins .26m ahead of the hip.
  ctx.add(root, geoThigh, mats.pants, [-0.08, 0.08, 0.12]);
  ctx.add(root, geoThigh, mats.pants, [0.08, 0.08, 0.12]);
  ctx.add(root, geoShin, mats.pants, [-0.08, 0.00, 0.19]);
  ctx.add(root, geoShin, mats.pants, [0.08, 0.00, 0.19]);
  ctx.add(root, geoFoot, mats.pants, [-0.08, -0.13, 0.20]);
  ctx.add(root, geoFoot, mats.pants, [0.08, -0.13, 0.20]);

  // Arms resting on lap bar, span <= 0.38m
  ctx.add(root, geoUpperArm, mats.shirt, [-0.17, 0.26, 0.00]);
  ctx.add(root, geoUpperArm, mats.shirt, [0.17, 0.26, 0.00]);
  ctx.add(root, geoForearm, mats.skin, [-0.14, 0.16, 0.15]);
  ctx.add(root, geoForearm, mats.skin, [0.14, 0.16, 0.15]);

  return root;
}

/**
 * Creates box geometry with face UVs mapped to physical metres, preventing texture stretching.
 */
function createPhysicalBox(sx, sy, sz) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const uvs = geo.attributes.uv;
  const scales = [
    [sz, sy], // +X
    [sz, sy], // -X
    [sx, sz], // +Y
    [sx, sz], // -Y
    [sx, sy], // +Z
    [sx, sy], // -Z
  ];
  for (let f = 0; f < 6; f++) {
    const [uScale, vScale] = scales[f];
    for (let v = 0; v < 4; v++) {
      const idx = f * 4 + v;
      uvs.setXY(idx, uvs.getX(idx) * uScale, uvs.getY(idx) * vScale);
    }
  }
  uvs.needsUpdate = true;
  return geo;
}

function addOrientedMesh(parent, geo, mat, center, quat) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(center);
  mesh.quaternion.copy(quat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/**
 * Export 1: Dynamic Vehicle Factory
 */
export function createWoodenVehicles(ctx, assets) {
  const group = new THREE.Group();
  group.name = 'WoodenVehicles';

  const cars = new Map();
  const links = new Map();

  function retargetBogie(bogieNode, sourceRestWorld, invSourcePivot, poseFrame) {
    if (!bogieNode || !sourceRestWorld || !invSourcePivot || !poseFrame) return;

    // Desired proxy from authoritative pose frame
    const bPos = simToThree(poseFrame.position);
    const bForward = simToThree(poseFrame.direction);
    const bUp = simToThree(poseFrame.up);
    const authoritativeProxy = makeBasisMatrix(bForward, bUp, bPos);

    // desiredWorld = authoritativeProxy * inv(sourcePivotTranslationOnly) * sourceRestWorld
    const desiredWorld = authoritativeProxy.clone().multiply(invSourcePivot).multiply(sourceRestWorld);

    // Convert with inverse(bogieNode.parent.matrixWorld)
    bogieNode.parent.updateMatrixWorld(true);
    const invParent = bogieNode.parent.matrixWorld.clone().invert();
    const localMat = invParent.multiply(desiredWorld);

    bogieNode.matrix.copy(localMat);
    bogieNode.matrix.decompose(bogieNode.position, bogieNode.quaternion, bogieNode.scale);
    bogieNode.updateMatrixWorld(true);
  }

  function update(packet) {
    if (!packet || !packet.cars) return;

    const activeCarIds = new Set();
    const activeLinkIds = new Set();

    for (const car of packet.cars) {
      if (car.rig?.kind !== 'wooden-coupled-flat') continue;
      activeCarIds.add(car.id);

      let record = cars.get(car.id);
      if (!record) {
        const carClone = assets.cloneCar();
        const wrapper = new THREE.Group();
        wrapper.name = `WoodenCar_${car.id}`;
        wrapper.add(carClone);
        group.add(wrapper);

        // Capture unit source-world rest matrices and pivots
        wrapper.position.set(0, 0, 0);
        wrapper.quaternion.identity();
        wrapper.scale.set(1, 1, 1);
        wrapper.updateMatrixWorld(true);

        const bogieFrontNode = carClone.getObjectByName('BogieFront');
        const bogieRearNode = carClone.getObjectByName('BogieRear');
        const lapBarFrontNode = carClone.getObjectByName('LapBar_Front');
        const lapBarRearNode = carClone.getObjectByName('LapBar_Rear');

        let bogieFrontRestWorld = null;
        let invBogieFrontPivot = null;
        if (bogieFrontNode) {
          bogieFrontRestWorld = bogieFrontNode.matrixWorld.clone();
          const p = new THREE.Vector3().setFromMatrixPosition(bogieFrontRestWorld);
          invBogieFrontPivot = new THREE.Matrix4().setPosition(p.negate());
        }

        let bogieRearRestWorld = null;
        let invBogieRearPivot = null;
        if (bogieRearNode) {
          bogieRearRestWorld = bogieRearNode.matrixWorld.clone();
          const p = new THREE.Vector3().setFromMatrixPosition(bogieRearRestWorld);
          invBogieRearPivot = new THREE.Matrix4().setPosition(p.negate());
        }

        // Canonical Three-basis seat anchors placed directly under wrapper at source-world pivots
        const seatAnchors = [];
        for (const name of SEAT_NODE_NAMES) {
          const seatEmpty = carClone.getObjectByName(name);
          if (seatEmpty) {
            seatEmpty.updateMatrixWorld(true);
            const seatWorldPos = new THREE.Vector3().setFromMatrixPosition(seatEmpty.matrixWorld);

            const anchor = new THREE.Group();
            anchor.name = `Canonical_${name}`;
            anchor.position.copy(seatWorldPos);
            anchor.quaternion.identity(); // Independent Three basis: +Y up, +Z front
            wrapper.add(anchor);
            seatAnchors.push(anchor);
          } else {
            seatAnchors.push(null);
          }
        }

        record = {
          wrapper,
          carClone,
          bogieFrontNode,
          bogieRearNode,
          bogieFrontRestWorld,
          invBogieFrontPivot,
          bogieRearRestWorld,
          invBogieRearPivot,
          lapBarFrontNode,
          lapBarRearNode,
          lapBarFrontRestQuat: lapBarFrontNode ? lapBarFrontNode.quaternion.clone() : null,
          lapBarRearRestQuat: lapBarRearNode ? lapBarRearNode.quaternion.clone() : null,
          seatAnchors,
          occupants: [null, null, null, null],
          passengerGroups: [null, null, null, null],
        };
        cars.set(car.id, record);
      }
      record.wrapper.userData.selection = { kind: 'ride', id: car.ride };

      // Authoritative car body pose
      const bodyPos = simToThree(car.position);
      const bodyForward = simToThree(car.direction);
      const bodyUp = simToThree(car.up);
      const bodyMat = makeBasisMatrix(bodyForward, bodyUp, bodyPos);

      record.wrapper.matrix.copy(bodyMat);
      record.wrapper.matrix.decompose(record.wrapper.position, record.wrapper.quaternion, record.wrapper.scale);
      record.wrapper.updateMatrixWorld(true);

      // Authoritative bogie retargeting
      retargetBogie(
        record.bogieFrontNode,
        record.bogieFrontRestWorld,
        record.invBogieFrontPivot,
        car.rig.bogieFront
      );
      retargetBogie(
        record.bogieRearNode,
        record.bogieRearRestWorld,
        record.invBogieRearPivot,
        car.rig.bogieRear
      );

      // Articulated lap bars: positive local-X opens bars
      const restraintsClosed = !!car.rig.restraintsClosed;
      const openQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), LAP_BAR_OPEN_ROTATION_X);

      if (record.lapBarFrontNode && record.lapBarFrontRestQuat) {
        if (restraintsClosed) {
          record.lapBarFrontNode.quaternion.copy(record.lapBarFrontRestQuat);
        } else {
          record.lapBarFrontNode.quaternion.copy(record.lapBarFrontRestQuat).multiply(openQuat);
        }
      }
      if (record.lapBarRearNode && record.lapBarRearRestQuat) {
        if (restraintsClosed) {
          record.lapBarRearNode.quaternion.copy(record.lapBarRearRestQuat);
        } else {
          record.lapBarRearNode.quaternion.copy(record.lapBarRearRestQuat).multiply(openQuat);
        }
      }

      // Ordered seat occupants preserving nulls
      const seatIds = Array.isArray(car.seatIds) ? car.seatIds : [];
      for (let s = 0; s < 4; s++) {
        const guestId = seatIds[s] ?? null;
        const anchor = record.seatAnchors[s];
        if (!anchor) continue;

        if (record.occupants[s] !== guestId) {
          if (record.passengerGroups[s]) {
            record.passengerGroups[s].removeFromParent();
            record.passengerGroups[s] = null;
          }
          if (guestId !== null) {
            const guestMesh = buildSeatedGuest(ctx, guestId);
            anchor.add(guestMesh);
            record.passengerGroups[s] = guestMesh;
          }
          record.occupants[s] = guestId;
        }
      }

      // Drawbar hitch link
      if (car.rig.link) {
        activeLinkIds.add(car.id);
        let linkGroup = links.get(car.id);
        if (!linkGroup) {
          const linkClone = assets.cloneLink();
          linkGroup = new THREE.Group();
          linkGroup.name = `WoodenLink_${car.id}`;
          linkGroup.add(linkClone);
          group.add(linkGroup);
          links.set(car.id, linkGroup);
        }
        linkGroup.userData.selection = { kind: 'ride', id: car.ride };
        const lPos = simToThree(car.rig.link.position);
        const lForward = simToThree(car.rig.link.direction);
        const lUp = simToThree(car.rig.link.up);
        const lMat = makeBasisMatrix(lForward, lUp, lPos);
        linkGroup.matrix.copy(lMat);
        linkGroup.matrix.decompose(linkGroup.position, linkGroup.quaternion, linkGroup.scale);
      }
    }

    // Clean obsolete cars without disposing shared templates
    for (const [id, rec] of cars.entries()) {
      if (!activeCarIds.has(id)) {
        rec.wrapper.removeFromParent();
        cars.delete(id);
      }
    }

    // Clean obsolete links
    for (const [id, linkGroup] of links.entries()) {
      if (!activeLinkIds.has(id)) {
        linkGroup.removeFromParent();
        links.delete(id);
      }
    }
  }

  function dispose() {
    for (const rec of cars.values()) {
      rec.wrapper.removeFromParent();
    }
    cars.clear();

    for (const linkGroup of links.values()) {
      linkGroup.removeFromParent();
    }
    links.clear();

    group.clear();
  }

  function status() {
    return {
      activeCars: cars.size,
      activeLinks: links.size,
    };
  }

  return { group, update, dispose, status };
}

/**
 * Station Bay Construction
 */
function buildStationBay(ctx, parent, element, ride, scenery, assets) {
  const stationClone = assets.cloneStation();

  const trackDir = element.origin.direction;
  const [fx, fy] = DIRECTIONS[trackDir];

  // Exact station reference from portals
  const referencingPortals = scenery?.elements
    ? scenery.elements.filter(e => e.kind === 'portal' && e.station === element.id)
    : [];

  const yaw = referencingPortals.length > 0 ? portalMountYaw(referencingPortals[0], element) : 0;
  const isTurned = (yaw === 2);

  // Station centre = native origin/8 + fixed world (2, 2) + 2m along native piece forward
  const centreX = element.origin.x / 8 + 2 + fx * 2;
  const centreY = element.origin.y / 8 + 2 + fy * 2;
  const centreZ = element.origin.z / 8;
  const stationCenterThree = new THREE.Vector3(centreX, centreZ, centreY);

  const forward = (isTurned ? NATIVE_DIRECTIONS[trackDir].clone().negate() : NATIVE_DIRECTIONS[trackDir].clone());
  const up = new THREE.Vector3(0, 1, 0);

  // Map source hierarchy directly preserving rest orientation
  const right = new THREE.Vector3().crossVectors(up, forward).normalize();
  const stationMatrix = new THREE.Matrix4().makeBasis(right, up, forward).setPosition(stationCenterThree);
  stationClone.matrix.copy(stationMatrix);
  stationClone.matrix.decompose(stationClone.position, stationClone.quaternion, stationClone.scale);
  stationClone.updateMatrixWorld(true);

  // Active portal hinge opening: postmultiply ORIGINAL local rest quat with local-X +pi/2
  const hasActiveEntrance = referencingPortals.some(p => p.role === 'entrance');
  const hasActiveExit = referencingPortals.some(p => p.role === 'exit');
  const openHingeQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);

  stationClone.traverse(child => {
    if (child.name === 'QueueGate_Hinge') {
      if (!child.userData.restQuat) child.userData.restQuat = child.quaternion.clone();
      if (hasActiveEntrance) {
        child.quaternion.copy(child.userData.restQuat).multiply(openHingeQuat);
      } else {
        child.quaternion.copy(child.userData.restQuat);
      }
    }
    if (child.name === 'ExitGate_Hinge') {
      if (!child.userData.restQuat) child.userData.restQuat = child.quaternion.clone();
      if (hasActiveExit) {
        child.quaternion.copy(child.userData.restQuat).multiply(openHingeQuat);
      } else {
        child.quaternion.copy(child.userData.restQuat);
      }
    }
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  parent.add(stationClone);
}

/**
 * Open Track Construction
 * Matches diagnosed PTC-style running gear clearances:
 * - Upstop tyres run at base+.30..42, tyre width |X|.455..505
 * - C-hanger webs stay outboard at |X| >= .570; contact ledges meet hub/tyre faces
 * - Timber stringers centers at normal +/- .55, width .20, height .12, center Y base+.12 (top .18)
 * - Sleepers 1.40 wide, .10 high, .16 axial, center Y base+.23 (bottom .18/top .28)
 * - Trestles terminate at underside of bed (base+.06)
 * - Canonical rectangular metal rail:
 *   * Head: width .07, height .06 centered at gauge (+/- .48), center Y base+.47 (top base+.50)
 *   * Flange: width .232, height .02 centered at normal +/- .416, center Y base+.43
 *   * Supported inboard web: width .024, height .26 centered at normal +/- .312, center Y base+.31 (bottom .18/top .44)
 */
function buildMergedMesh(ctx, targetGroup, material, bucket) {
  if (!bucket || bucket.length === 0) return null;

  let totalVertices = 0;
  let totalIndices = 0;
  for (const item of bucket) {
    totalVertices += item.geometry.attributes.position.count;
    totalIndices += item.geometry.index ? item.geometry.index.count : 0;
  }
  if (totalVertices === 0) return null;

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const uvs = new Float32Array(totalVertices * 2);
  const indices = totalVertices > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;
  const normalMatrix = new THREE.Matrix3();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (const item of bucket) {
    const geo = item.geometry;
    const mat = item.matrix;
    if (mat) normalMatrix.getNormalMatrix(mat);

    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const idx = geo.index;

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (mat) v.applyMatrix4(mat);
      positions[(vertexOffset + i) * 3] = v.x;
      positions[(vertexOffset + i) * 3 + 1] = v.y;
      positions[(vertexOffset + i) * 3 + 2] = v.z;

      if (norm) {
        n.fromBufferAttribute(norm, i);
        if (mat) n.applyMatrix3(normalMatrix).normalize();
        normals[(vertexOffset + i) * 3] = n.x;
        normals[(vertexOffset + i) * 3 + 1] = n.y;
        normals[(vertexOffset + i) * 3 + 2] = n.z;
      }

      if (uv) {
        uvs[(vertexOffset + i) * 2] = uv.getX(i);
        uvs[(vertexOffset + i) * 2 + 1] = uv.getY(i);
      }
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[indexOffset + i] = idx.getX(i) + vertexOffset;
      }
      indexOffset += idx.count;
    }

    vertexOffset += pos.count;
  }

  const mergedGeo = new THREE.BufferGeometry();
  mergedGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  mergedGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  mergedGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  mergedGeo.setIndex(new THREE.BufferAttribute(indices, 1));
  mergedGeo.computeBoundingBox();
  mergedGeo.computeBoundingSphere();

  ctx.ownGeometry(mergedGeo);

  const mesh = new THREE.Mesh(mergedGeo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  targetGroup.add(mesh);
  return mesh;
}

function buildOpenTrack(ctx, parent, element, ride, assets) {
  const profile = ride?.trackProfile;
  const pieceDef = profile?.pieces?.[element.piece];
  if (!pieceDef || !pieceDef.motion?.samples || pieceDef.motion.samples.length < 2) {
    throw new Error(`Invalid or missing motion samples for track piece: ${element.piece}`);
  }

  const trackDir = element.origin.direction;
  const [fx, fy] = DIRECTIONS[trackDir];
  const originX = element.origin.x / 8;
  const originY = element.origin.y / 8;
  const base = element.origin.z / 8;

  const matTimber = assets.materials.timber;
  const baseMetal = assets.materials.metal;
  const sharedMaps = {};
  if (baseMetal) {
    if (baseMetal.map) sharedMaps.map = baseMetal.map;
    if (baseMetal.roughnessMap) sharedMaps.roughnessMap = baseMetal.roughnessMap;
    if (baseMetal.metalnessMap) sharedMaps.metalnessMap = baseMetal.metalnessMap;
    if (baseMetal.normalMap) sharedMaps.normalMap = baseMetal.normalMap;
  }

  const matRailHead = ctx.material('wooden:track:rail-head', {
    color: '#b6b5ad',
    roughness: 0.42,
    metalness: 0.25,
    ...sharedMaps,
  });

  const matRailFlangeWeb = ctx.material('wooden:track:rail-flange-web', {
    color: '#4b5563',
    roughness: 0.65,
    metalness: 0.60,
    ...sharedMaps,
  });

  // Exact ordered native vertices rotated by original direction plus fixed WORLD +2, +2
  const samples = pieceDef.motion.samples;
  const pts = samples.map(s => {
    const mx = s.x / 8;
    const my = s.y / 8;
    const mz = s.z / 8;
    const wx = originX + 2 + fx * mx - fy * my;
    const wz = originY + 2 + fy * mx + fx * my;
    const wy = base + mz;
    return new THREE.Vector3(wx, wy, wz);
  });

  const trackGroup = new THREE.Group();
  trackGroup.name = `WoodenTrack_${element.id}`;

  const geoSleeper = ctx.geometry('wooden:sleeper:1.40:0.10:0.16', () => createPhysicalBox(1.40, 0.10, 0.16));
  const geoBentLedger = ctx.geometry('wooden:ledger:1.58:0.10:0.10', () => createPhysicalBox(1.58, 0.10, 0.10));

  const bucketRailHead = [];
  const bucketRailFlangeWeb = [];
  const bucketTimber = [];
  const disposables = [];

  let accumulatedDist = 0;
  let nextSleeperDist = 0;
  let nextBentDist = 0.975;
  const SLEEPER_SPACING = 0.65;
  const BENT_SPACING = 1.95;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const chord = p1.clone().sub(p0);
    const chordLen = chord.length();
    if (chordLen < 0.0001) continue;

    const fwd = chord.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(up, fwd).normalize();
    const segCenter = p0.clone().add(p1).multiplyScalar(0.5);
    const chordRot = new THREE.Quaternion().setFromRotationMatrix(makeBasisMatrix(fwd, up, segCenter));

    // Per-chord variable-length geometries with physical metre UV mapping
    const geoRailHead = createPhysicalBox(0.07, 0.06, chordLen);
    const geoRailFlange = createPhysicalBox(0.232, 0.02, chordLen);
    const geoRailWeb = createPhysicalBox(0.024, 0.26, chordLen);
    const geoStringer = createPhysicalBox(0.20, 0.12, chordLen);
    disposables.push(geoRailHead, geoRailFlange, geoRailWeb, geoStringer);

    // 1. Rectangular rail head: width .07, height .06 centered at gauge (+/- .48), Y base+.47 (top base+.50)
    const leftHead = segCenter.clone().addScaledVector(normal, -0.48); leftHead.y = base + 0.47;
    const rightHead = segCenter.clone().addScaledVector(normal, 0.48); rightHead.y = base + 0.47;
    bucketRailHead.push({ geometry: geoRailHead, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(leftHead) });
    bucketRailHead.push({ geometry: geoRailHead, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(rightHead) });

    // The support web stays inboard so the outboard upstop axle can pass below the flange.
    const leftFlange = segCenter.clone().addScaledVector(normal, -0.416); leftFlange.y = base + 0.43;
    const rightFlange = segCenter.clone().addScaledVector(normal, 0.416); rightFlange.y = base + 0.43;
    bucketRailFlangeWeb.push({ geometry: geoRailFlange, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(leftFlange) });
    bucketRailFlangeWeb.push({ geometry: geoRailFlange, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(rightFlange) });

    // The inboard web joins sleepers and the rail flange below the guide wheels.
    const leftWeb = segCenter.clone().addScaledVector(normal, -0.312); leftWeb.y = base + 0.31;
    const rightWeb = segCenter.clone().addScaledVector(normal, 0.312); rightWeb.y = base + 0.31;
    bucketRailFlangeWeb.push({ geometry: geoRailWeb, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(leftWeb) });
    bucketRailFlangeWeb.push({ geometry: geoRailWeb, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(rightWeb) });

    // 4. Longitudinal timber stringers: width .20, height .12 centered at normal +/- .55, Y base+.12 (top .18)
    const leftStringer = segCenter.clone().addScaledVector(normal, -0.55); leftStringer.y = base + 0.12;
    const rightStringer = segCenter.clone().addScaledVector(normal, 0.55); rightStringer.y = base + 0.12;
    bucketTimber.push({ geometry: geoStringer, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(leftStringer) });
    bucketTimber.push({ geometry: geoStringer, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(rightStringer) });

    // 5. Timber sleepers: 1.40 wide, .10 high, .16 axial, center Y base+.23 (bottom .18 / top .28)
    while (nextSleeperDist <= accumulatedDist + chordLen) {
      const frac = (nextSleeperDist - accumulatedDist) / chordLen;
      const sleeperPos = p0.clone().lerp(p1, frac);
      sleeperPos.y = base + 0.23;
      bucketTimber.push({ geometry: geoSleeper, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(sleeperPos) });
      nextSleeperDist += SLEEPER_SPACING;
    }

    // 6. Elevated structural timber trestle bents terminating at underside of bed (base+.06)
    while (nextBentDist <= accumulatedDist + chordLen) {
      const frac = (nextBentDist - accumulatedDist) / chordLen;
      const bentPos = p0.clone().lerp(p1, frac);

      const tileX = Math.floor(bentPos.x / 4);
      const tileZ = Math.floor(bentPos.z / 4);
      const groundY = ctx.surfaceHeight ? ctx.surfaceHeight(tileX, tileZ) : 4;

      if (base > groundY + 0.60) {
        const heightSpan = (base + 0.06) - groundY;
        const postCenterY = groundY + heightSpan * 0.5;

        // Two vertical timber posts with physical metre UVs
        const geoBentPost = createPhysicalBox(0.14, heightSpan, 0.14);
        disposables.push(geoBentPost);

        const postL = bentPos.clone().addScaledVector(normal, -0.72);
        postL.y = postCenterY;
        const postR = bentPos.clone().addScaledVector(normal, 0.72);
        postR.y = postCenterY;

        bucketTimber.push({ geometry: geoBentPost, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(postL) });
        bucketTimber.push({ geometry: geoBentPost, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(postR) });

        // Cross ledgers
        const tiers = Math.max(1, Math.floor(heightSpan / 1.8));
        for (let t = 1; t <= tiers; t++) {
          const ledgerPos = bentPos.clone();
          ledgerPos.y = groundY + t * (heightSpan / (tiers + 1));
          bucketTimber.push({ geometry: geoBentLedger, matrix: new THREE.Matrix4().makeRotationFromQuaternion(chordRot).setPosition(ledgerPos) });
        }

        // Structural diagonal brace
        const braceBot = postL.clone(); braceBot.y = groundY + 0.20;
        const braceTop = postR.clone(); braceTop.y = base + 0.06;
        const delta = braceTop.clone().sub(braceBot);
        const length = delta.length();
        if (length >= 0.0001) {
          const braceCenter = braceBot.clone().add(braceTop).multiplyScalar(0.5);
          const braceQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
          const cylBrace = ctx.geometry('unit-cylinder', () => new THREE.CylinderGeometry(.5, .5, 1, 12));
          bucketTimber.push({ geometry: cylBrace, matrix: new THREE.Matrix4().compose(braceCenter, braceQuat, new THREE.Vector3(.09, length, .09)) });
        }
      }

      nextBentDist += BENT_SPACING;
    }

    accumulatedDist += chordLen;
  }

  buildMergedMesh(ctx, trackGroup, matRailHead, bucketRailHead);
  buildMergedMesh(ctx, trackGroup, matRailFlangeWeb, bucketRailFlangeWeb);
  buildMergedMesh(ctx, trackGroup, matTimber, bucketTimber);

  for (const g of disposables) {
    g.dispose();
  }

  parent.add(trackGroup);
}

/**
 * Export 2: Static Track Builder
 */
export function buildWoodenTrack(ctx, parent, element, ride, scenery, assets) {
  if (!element.origin || element.origin.direction === undefined) {
    throw new Error('Track element missing origin or origin.direction');
  }
  const pieceDef = ride?.trackProfile?.pieces?.[element.piece];
  if (!pieceDef) {
    throw new Error(`Track piece definition missing for piece: ${element.piece}`);
  }

  if (pieceDef.station) {
    buildStationBay(ctx, parent, element, ride, scenery, assets);
  } else {
    buildOpenTrack(ctx, parent, element, ride, assets);
  }
}

/**
 * Export 3: Real Timber Portal Transition Builder
 */
export function buildWoodenPortal(ctx, parent, element, ride, scenery, assets) {
  if (element.role !== 'entrance' && element.role !== 'exit') {
    throw new Error(`Invalid or missing portal role: ${element.role}`);
  }

  const station = scenery?.elements?.find(e => e.kind === 'track' && e.id === element.station);
  if (!station) {
    throw new Error(`Station track ${element.station} not found for portal ${element.id}`);
  }
  const stationPieceDef = ride?.trackProfile?.pieces?.[station.piece];
  if (!stationPieceDef?.station) {
    throw new Error(`Station piece definition ${station.piece} not marked as station`);
  }

  const { gate, landing, ingress } = woodenTransition(element, station);
  const expectedGateThree = simToThree(gate);

  const anchorName = element.role === 'entrance' ? 'QueueGate' : 'ExitGate';
  if (typeof assets?.stationAnchor !== 'function') {
    throw new Error('assets.stationAnchor helper is required');
  }
  const unitAnchorPos = assets.stationAnchor(anchorName);
  if (!unitAnchorPos) {
    throw new Error(`Station anchor ${anchorName} not found via assets.stationAnchor`);
  }

  const trackDir = station.origin.direction;
  const yaw = portalMountYaw(element, station);
  const isTurned = (yaw === 2);

  const [fx, fy] = DIRECTIONS[trackDir];
  const centreX = station.origin.x / 8 + 2 + fx * 2;
  const centreY = station.origin.y / 8 + 2 + fy * 2;
  const centreZ = station.origin.z / 8;
  const stationCenterThree = new THREE.Vector3(centreX, centreZ, centreY);

  const forward = (isTurned ? NATIVE_DIRECTIONS[trackDir].clone().negate() : NATIVE_DIRECTIONS[trackDir].clone());
  const up = new THREE.Vector3(0, 1, 0);
  const desiredStationProxy = makeBasisMatrix(forward, up, stationCenterThree);

  const actualGateThree = unitAnchorPos.clone().applyMatrix4(desiredStationProxy);
  const diff = actualGateThree.distanceTo(expectedGateThree);
  if (diff > 1e-5) {
    throw new Error(`Gate anchor mismatch: measured ${diff.toFixed(7)}m exceeds 1e-5m tolerance`);
  }

  const landingThree = simToThree(landing);
  const ingressThree = simToThree(ingress);

  const portalGroup = new THREE.Group();
  portalGroup.name = `WoodenPortal_${element.id}`;

  const matTimber = assets.materials.timber;
  const matBoards = assets.materials.boards;

  const [dx, dy] = DIRECTIONS[element.direction];
  const walkDir = new THREE.Vector3(dx, 0, dy);
  const lateralDir = new THREE.Vector3().crossVectors(up, walkDir).normalize();
  const walkwayQuat = new THREE.Quaternion().setFromRotationMatrix(makeBasisMatrix(walkDir, up, landingThree));

  const jog = new THREE.Vector3().subVectors(ingressThree, landingThree).dot(lateralDir);
  const hasJog = Math.abs(jog) > 1e-4;

  const clearWidth = 0.60;
  const halfClear = clearWidth * 0.5;
  const runLower = 0.70;
  const numSteps = 4;
  const stepRun = 0.50;
  const stepRise = 0.17;
  const runUpper = 4.17 - (runLower + numSteps * stepRun); // 1.47m

  // 1. Lower landing
  const lowerPlankWidth = hasJog ? (clearWidth + Math.abs(jog)) : clearWidth;
  const geoLowerPlank = ctx.ownGeometry(createPhysicalBox(lowerPlankWidth, 0.05, runLower));
  const bCenter = landingThree.clone().addScaledVector(walkDir, runLower * 0.5);
  if (hasJog) bCenter.addScaledVector(lateralDir, jog * 0.5);
  bCenter.y -= 0.025;
  addOrientedMesh(portalGroup, geoLowerPlank, matBoards, bCenter, walkwayQuat);

  // 2. Four 0.17m stair risers
  const geoStepPlank = ctx.geometry('wooden:step:0.60:0.05:0.50', () => createPhysicalBox(clearWidth, 0.05, stepRun));
  for (let s = 0; s < numSteps; s++) {
    const sCenter = landingThree.clone().addScaledVector(walkDir, runLower + (s + 0.5) * stepRun);
    sCenter.y = centreZ + 0.14 + (s + 1) * stepRise - 0.025;
    addOrientedMesh(portalGroup, geoStepPlank, matBoards, sCenter, walkwayQuat);
  }

  // 3. Upper landing
  const geoUpperPlank = ctx.ownGeometry(createPhysicalBox(clearWidth, 0.05, runUpper));
  const uCenter = landingThree.clone().addScaledVector(walkDir, runLower + numSteps * stepRun + runUpper * 0.5);
  uCenter.y = centreZ + 0.82 - 0.025;
  addOrientedMesh(portalGroup, geoUpperPlank, matBoards, uCenter, walkwayQuat);

  // 4. Safety kerbs
  const geoKerbStep = ctx.geometry('wooden:kerb:step:0.04:0.06:0.50', () => createPhysicalBox(0.04, 0.06, stepRun));
  const geoKerbUpper = ctx.ownGeometry(createPhysicalBox(0.04, 0.06, runUpper));

  for (const sign of [-1, 1]) {
    for (let s = 0; s < numSteps; s++) {
      const sCenter = landingThree.clone().addScaledVector(walkDir, runLower + (s + 0.5) * stepRun);
      sCenter.y = centreZ + 0.14 + (s + 1) * stepRise + 0.015;
      const kPos = sCenter.addScaledVector(lateralDir, sign * (halfClear + 0.02));
      addOrientedMesh(portalGroup, geoKerbStep, matTimber, kPos, walkwayQuat);
    }
    const kPosU = uCenter.clone().addScaledVector(lateralDir, sign * (halfClear + 0.02));
    kPosU.y += 0.04;
    addOrientedMesh(portalGroup, geoKerbUpper, matTimber, kPosU, walkwayQuat);
  }

  if (!hasJog) {
    const geoKerbLower = ctx.ownGeometry(createPhysicalBox(0.04, 0.06, runLower));
    for (const sign of [-1, 1]) {
      const kPosL = bCenter.clone().addScaledVector(lateralDir, sign * (halfClear + 0.02));
      kPosL.y += 0.04;
      addOrientedMesh(portalGroup, geoKerbLower, matTimber, kPosL, walkwayQuat);
    }
  } else {
    const absJog = Math.abs(jog);
    const jogSign = Math.sign(jog);
    const xKerbMin = Math.min(0, jog) - 0.32;
    const xKerbMax = Math.max(0, jog) + 0.32;
    const geoKerbSide = ctx.ownGeometry(createPhysicalBox(0.04, 0.06, 0.63));
    for (const xK of [xKerbMin, xKerbMax]) {
      const kPos = landingThree.clone().addScaledVector(lateralDir, xK).addScaledVector(walkDir, 0.385);
      kPos.y = landingThree.y + 0.015;
      addOrientedMesh(portalGroup, geoKerbSide, matTimber, kPos, walkwayQuat);
    }

    const geoKerbCross = ctx.ownGeometry(createPhysicalBox(absJog, 0.06, 0.04));
    const kPosFront = landingThree.clone().addScaledVector(lateralDir, jog * 0.5 - jogSign * 0.35).addScaledVector(walkDir, 0.07);
    kPosFront.y = landingThree.y + 0.015;
    addOrientedMesh(portalGroup, geoKerbCross, matTimber, kPosFront, walkwayQuat);

    const kPosBack = landingThree.clone().addScaledVector(lateralDir, jog * 0.5 + jogSign * 0.35).addScaledVector(walkDir, 0.70);
    kPosBack.y = landingThree.y + 0.015;
    addOrientedMesh(portalGroup, geoKerbCross, matTimber, kPosBack, walkwayQuat);
  }

  // 5. Handrails
  const railLateralOffset = halfClear + 0.05;
  for (const sign of [-1, 1]) {
    const side = lateralDir.clone().multiplyScalar(sign * railLateralOffset);

    const hr0 = landingThree.clone().add(side); hr0.y += 0.90;
    const hr1 = landingThree.clone().addScaledVector(walkDir, runLower).add(side); hr1.y = centreZ + 0.14 + 0.90;
    const hr2 = landingThree.clone().addScaledVector(walkDir, runLower + numSteps * stepRun).add(side); hr2.y = centreZ + 0.82 + 0.90;
    const hr3 = actualGateThree.clone().add(side); hr3.y = centreZ + 0.82 + 0.90;

    if (!hasJog) {
      ctx.segment(portalGroup, matTimber, hr0, hr1, 0.025);
    }
    ctx.segment(portalGroup, matTimber, hr1, hr2, 0.025);
    ctx.segment(portalGroup, matTimber, hr2, hr3, 0.025);

    const postPoints = hasJog ? [hr1, hr2, hr3] : [hr0, hr1, hr2, hr3];
    for (const pt of postPoints) {
      const postBot = pt.clone();
      postBot.y -= 0.90;
      ctx.segment(portalGroup, matTimber, postBot, pt, 0.025);
    }
  }

  if (hasJog) {
    const absJog = Math.abs(jog);
    const jogSign = Math.sign(jog);
    const xRailMin = Math.min(0, jog) - 0.35;
    const xRailMax = Math.max(0, jog) + 0.35;

    for (const xR of [xRailMin, xRailMax]) {
      const rStart = landingThree.clone().addScaledVector(lateralDir, xR).addScaledVector(walkDir, 0.07); rStart.y += 0.90;
      const rEnd = landingThree.clone().addScaledVector(lateralDir, xR).addScaledVector(walkDir, 0.70); rEnd.y += 0.90;
      ctx.segment(portalGroup, matTimber, rStart, rEnd, 0.025);
    }

    const xFrontCenter = jog * 0.5 - jogSign * 0.35;
    const rfStart = landingThree.clone().addScaledVector(lateralDir, xFrontCenter - absJog * 0.5).addScaledVector(walkDir, 0.07); rfStart.y += 0.90;
    const rfEnd = landingThree.clone().addScaledVector(lateralDir, xFrontCenter + absJog * 0.5).addScaledVector(walkDir, 0.07); rfEnd.y += 0.90;
    ctx.segment(portalGroup, matTimber, rfStart, rfEnd, 0.025);

    const xBackCenter = jog * 0.5 + jogSign * 0.35;
    const rbStart = landingThree.clone().addScaledVector(lateralDir, xBackCenter - absJog * 0.5).addScaledVector(walkDir, 0.70); rbStart.y += 0.90;
    const rbEnd = landingThree.clone().addScaledVector(lateralDir, xBackCenter + absJog * 0.5).addScaledVector(walkDir, 0.70); rbEnd.y += 0.90;
    ctx.segment(portalGroup, matTimber, rbStart, rbEnd, 0.025);

    const lowerPosts = [
      [jog - 0.35, 0.07],
      [jog + 0.35, 0.07],
      [-jogSign * 0.35, 0.07],
      [jog + jogSign * 0.35, 0.70]
    ];
    for (const [xP, zP] of lowerPosts) {
      const pTop = landingThree.clone().addScaledVector(lateralDir, xP).addScaledVector(walkDir, zP); pTop.y += 0.90;
      const pBot = pTop.clone(); pBot.y -= 0.90;
      ctx.segment(portalGroup, matTimber, pBot, pTop, 0.025);
    }
  }

  parent.add(portalGroup);
}
