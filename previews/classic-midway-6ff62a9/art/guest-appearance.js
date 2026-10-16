import * as THREE from 'three';

export const GUEST_TORSO_BASE_HEX = '#ffffff';
export const GUEST_TROUSERS_BASE_HEX = '#ffffff';
export const GUEST_HEAD_BASE_HEX = '#ebc19c';
export const GUEST_HAIR_BASE_HEX = '#ffffff';

export const GUEST_SHIRT_PALETTE = Object.freeze([
  '#d7b247',
  '#bb6047',
  '#83a56f',
  '#4c7999',
  '#b789a6',
  '#e2dfcf',
  '#c2593f',
  '#388265',
  '#5862a3',
  '#b87d32',
]);

export const GUEST_TROUSERS_PALETTE = Object.freeze([
  '#2b3d54',
  '#383c42',
  '#8a7e6b',
  '#465042',
  '#22262a',
]);

export const GUEST_PANTS_PALETTE = GUEST_TROUSERS_PALETTE;

export const GUEST_SKIN_PALETTE = Object.freeze([
  '#ebc19c',
  '#f0cab0',
  '#dfa77b',
  '#c68652',
]);

export const GUEST_HAIR_PALETTE = Object.freeze([
  '#382416',
  '#1f1c19',
  '#c4964b',
  '#82341d',
]);

export const GUEST_BOOT_PALETTE = Object.freeze([
  '#1e272e',
  '#2c1e18',
  '#3d2b1f',
]);

export const GUEST_MATERIAL_FINISH = Object.freeze({
  shirt: Object.freeze({ roughness: 0.76, metalness: 0 }),
  pants: Object.freeze({ roughness: 0.84, metalness: 0 }),
  skin: Object.freeze({ roughness: 0.58, metalness: 0 }),
  hair: Object.freeze({ roughness: 0.88, metalness: 0 }),
  boot: Object.freeze({ roughness: 0.48, metalness: 0.08 }),
});

export const STAFF_APPEARANCE_COLORS = Object.freeze({
  mechanicUniform: new THREE.Color('#326794'),
  mechanicCap: new THREE.Color('#214563'),
  handymanUniform: new THREE.Color('#e0b44a'),
  handymanCap: new THREE.Color('#ba8a25'),
  pants: new THREE.Color('#2a3e52'),
});

const TORSO_BASE_COLOR = new THREE.Color(GUEST_TORSO_BASE_HEX);
const TROUSERS_BASE_COLOR = new THREE.Color(GUEST_TROUSERS_BASE_HEX);
const HEAD_BASE_COLOR = new THREE.Color(GUEST_HEAD_BASE_HEX);
const HAIR_BASE_COLOR = new THREE.Color(GUEST_HAIR_BASE_HEX);

const SHIRT_ENTRIES = GUEST_SHIRT_PALETTE.map((instanceHex, index) => {
  const instanceColor = new THREE.Color(instanceHex);
  const linearColor = TORSO_BASE_COLOR.clone().multiply(instanceColor);
  return Object.freeze({
    index,
    instanceHex,
    hex: `#${linearColor.getHexString()}`,
    instanceColor,
    color: linearColor,
  });
});

const PANTS_ENTRIES = GUEST_TROUSERS_PALETTE.map((instanceHex, index) => {
  const instanceColor = new THREE.Color(instanceHex);
  const linearColor = TROUSERS_BASE_COLOR.clone().multiply(instanceColor);
  return Object.freeze({
    index,
    instanceHex,
    hex: `#${linearColor.getHexString()}`,
    instanceColor,
    color: linearColor,
  });
});

const SKIN_ENTRIES = GUEST_SKIN_PALETTE.map((instanceHex, index) => {
  const instanceColor = new THREE.Color(instanceHex);
  const linearColor = HEAD_BASE_COLOR.clone().multiply(instanceColor);
  return Object.freeze({
    index,
    instanceHex,
    hex: `#${linearColor.getHexString()}`,
    instanceColor,
    color: linearColor,
  });
});

const HAIR_ENTRIES = GUEST_HAIR_PALETTE.map((instanceHex, index) => {
  const instanceColor = new THREE.Color(instanceHex);
  const linearColor = HAIR_BASE_COLOR.clone().multiply(instanceColor);
  return Object.freeze({
    index,
    instanceHex,
    hex: `#${linearColor.getHexString()}`,
    instanceColor,
    color: linearColor,
  });
});

const BOOT_ENTRIES = GUEST_BOOT_PALETTE.map((instanceHex, index) => {
  const linearColor = new THREE.Color(instanceHex);
  return Object.freeze({
    index,
    instanceHex,
    hex: `#${linearColor.getHexString()}`,
    instanceColor: linearColor,
    color: linearColor,
  });
});

// LCM(10, 5, 4, 4, 3) = 60 finite deterministic guest appearance descriptors
const APPEARANCE_PERIOD = 60;
const APPEARANCE_TABLE = Array.from({ length: APPEARANCE_PERIOD }, (_, slot) => {
  const shirt = SHIRT_ENTRIES[slot % SHIRT_ENTRIES.length];
  const pants = PANTS_ENTRIES[slot % PANTS_ENTRIES.length];
  const skin = SKIN_ENTRIES[slot % SKIN_ENTRIES.length];
  const hair = HAIR_ENTRIES[slot % HAIR_ENTRIES.length];
  const boot = BOOT_ENTRIES[(slot * 17) % BOOT_ENTRIES.length];

  return Object.freeze({
    slot,
    shirtIndex: shirt.index,
    pantsIndex: pants.index,
    trousersIndex: pants.index,
    skinIndex: skin.index,
    hairIndex: hair.index,
    bootIndex: boot.index,
    shirtHex: shirt.hex,
    pantsHex: pants.hex,
    trousersHex: pants.hex,
    skinInstanceHex: skin.instanceHex,
    skinHex: skin.hex,
    hairHex: hair.hex,
    bootHex: boot.hex,
    shirtInstanceColor: shirt.instanceColor,
    shirtColor: shirt.color,
    pantsInstanceColor: pants.instanceColor,
    pantsColor: pants.color,
    trousersColor: pants.color,
    skinInstanceColor: skin.instanceColor,
    skinColor: skin.color,
    hairInstanceColor: hair.instanceColor,
    hairColor: hair.color,
    bootColor: boot.color,
  });
});

function normalizeGuestSeed(guestId) {
  if (!Number.isFinite(guestId)) return 0;
  return Math.abs(Math.trunc(guestId));
}

export function getGuestAppearance(guestId) {
  const seed = normalizeGuestSeed(guestId);
  return APPEARANCE_TABLE[seed % APPEARANCE_PERIOD];
}

function resolveMaterial(ctx, key, props) {
  if (ctx && typeof ctx.material === 'function') {
    return ctx.material(key, props);
  }
  return new THREE.MeshStandardMaterial(props);
}

export function getGuestMaterials(ctx, guestId) {
  const appearance = getGuestAppearance(guestId);

  return {
    shirt: resolveMaterial(ctx, `guest:shirt:${appearance.shirtHex}`, {
      color: appearance.shirtColor.clone(),
      ...GUEST_MATERIAL_FINISH.shirt,
    }),
    pants: resolveMaterial(ctx, `guest:pants:${appearance.pantsHex}`, {
      color: appearance.pantsColor.clone(),
      ...GUEST_MATERIAL_FINISH.pants,
    }),
    skin: resolveMaterial(ctx, `guest:skin:${appearance.skinInstanceHex}`, {
      color: appearance.skinColor.clone(),
      ...GUEST_MATERIAL_FINISH.skin,
    }),
    hair: resolveMaterial(ctx, `guest:hair:${appearance.hairHex}`, {
      color: appearance.hairColor.clone(),
      ...GUEST_MATERIAL_FINISH.hair,
    }),
    boot: resolveMaterial(ctx, `guest:boot:${appearance.bootHex}`, {
      color: appearance.bootColor.clone(),
      ...GUEST_MATERIAL_FINISH.boot,
    }),
  };
}
