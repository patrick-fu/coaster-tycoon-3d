import * as THREE from 'three';

/**
 * Coaster Tycoon 3D - Production Building and Amenity Art Module
 *
 * Implements authoritative RCT2-inspired 3D facility silhouettes and park amenities
 * using project-owned procedural geometries and CanvasTextures under MIT.
 *
 * Exports:
 * - buildFacility(ctx, parent, e, facility)
 * - buildAmenity(ctx, parent, e, amenity)
 */

// ---------------------------------------------------------------------------
// Helpers & Resource Caching
// ---------------------------------------------------------------------------

function sanitizeName(str, fallback) {
  if (!str || typeof str !== 'string') return fallback;
  const clean = str.replace(/[<>&"']/g, '').trim();
  return clean.length ? clean : fallback;
}

function getTexture(ctx, key, width, height, painter) {
  if (ctx && typeof ctx.texture === 'function') {
    return ctx.texture(key, width, height, painter);
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d');
    painter(g, width, height);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  return null;
}

function getMaterial(ctx, key, props) {
  if (ctx && typeof ctx.material === 'function') {
    return ctx.material(key, props);
  }
  return new THREE.MeshStandardMaterial(props);
}

function unitBox(ctx, parent, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  let m;
  if (ctx && typeof ctx.box === 'function') {
    m = ctx.box(parent, mat, x, y, z, sx, sy, sz);
  } else {
    const geo = ctx?.geometry ? ctx.geometry('unit_box', () => new THREE.BoxGeometry(1, 1, 1)) : new THREE.BoxGeometry(1, 1, 1);
    m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
  }
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  return m;
}

function unitCylinder(ctx, parent, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  let m;
  if (ctx && typeof ctx.cylinder === 'function') {
    m = ctx.cylinder(parent, mat, x, y, z, sx, sy, sz);
  } else {
    const geo = ctx?.geometry ? ctx.geometry('unit_cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 16)) : new THREE.CylinderGeometry(1, 1, 1, 16);
    m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
  }
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  return m;
}

function unitSphere(ctx, parent, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  let m;
  if (ctx && typeof ctx.sphere === 'function') {
    m = ctx.sphere(parent, mat, x, y, z, sx, sy, sz);
  } else {
    const geo = ctx?.geometry ? ctx.geometry('unit_sphere', () => new THREE.SphereGeometry(1, 12, 8)) : new THREE.SphereGeometry(1, 12, 8);
    m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
  }
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  return m;
}

function unitCone(ctx, parent, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  let m;
  if (ctx && typeof ctx.cone === 'function') {
    m = ctx.cone(parent, mat, x, y, z, sx, sy, sz);
  } else {
    const geo = ctx?.geometry ? ctx.geometry('unit_cone', () => new THREE.ConeGeometry(1, 1, 16)) : new THREE.ConeGeometry(1, 1, 16);
    m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
  }
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  return m;
}

function addLabel(ctx, parent, text, opts) {
  if (ctx && typeof ctx.text === 'function') {
    return ctx.text(parent, text, opts);
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const g = canvas.getContext('2d');
    g.fillStyle = opts.background || '#1e3a2f';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = opts.color || '#ffffff';
    g.font = 'bold 26px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new THREE.PlaneGeometry(opts.width || 1.6, opts.height || 0.4);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
    if (opts.rotation) mesh.rotation.set(...opts.rotation);
    parent.add(mesh);
    return mesh;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Procedural Canvas Textures (Deterministic & Bounded)
// ---------------------------------------------------------------------------

function ensureTextures(ctx) {
  // 1. Horizontal Rich Timber Wood Planks
  const wood = getTexture(ctx, 'tex_bld_wood', 128, 128, (g, w, h) => {
    g.fillStyle = '#835429';
    g.fillRect(0, 0, w, h);
    const plankH = 16;
    for (let y = 0; y < h; y += plankH) {
      g.fillStyle = (y / plankH) % 2 === 0 ? '#8d5d2f' : '#794c23';
      g.fillRect(0, y, w, plankH);
      g.fillStyle = '#4c2e12';
      g.fillRect(0, y + plankH - 2, w, 2);
      // Subtle wood grain lines
      g.fillStyle = 'rgba(255, 255, 255, 0.08)';
      g.fillRect(0, y + 4, w, 1);
      g.fillStyle = 'rgba(0, 0, 0, 0.12)';
      g.fillRect(0, y + 9, w, 1);
    }
  });

  // 2. Classical Red Terracotta Brick Wall (Running Bond)
  const brick = getTexture(ctx, 'tex_bld_brick', 128, 128, (g, w, h) => {
    g.fillStyle = '#dcd5c7'; // Mortar color
    g.fillRect(0, 0, w, h);
    const rowH = 16;
    const brickW = 32;
    for (let r = 0; r < h / rowH; r++) {
      const y = r * rowH;
      const offset = (r % 2) * (brickW / 2);
      for (let x = -brickW; x < w + brickW; x += brickW) {
        const bx = x + offset;
        const shade = (r * 3 + Math.floor(x / brickW)) % 3;
        g.fillStyle = shade === 0 ? '#b85f47' : shade === 1 ? '#a8523c' : '#c46950';
        g.fillRect(bx + 1, y + 1, brickW - 2, rowH - 2);
        // Bevel highlight & shadow
        g.fillStyle = 'rgba(255, 255, 255, 0.12)';
        g.fillRect(bx + 1, y + 1, brickW - 2, 2);
        g.fillStyle = 'rgba(0, 0, 0, 0.15)';
        g.fillRect(bx + 1, y + rowH - 3, brickW - 2, 2);
      }
    }
  });

  // 3. Heritage Scalloped Terracotta Roof Tiles
  const roof = getTexture(ctx, 'tex_bld_roof', 128, 128, (g, w, h) => {
    g.fillStyle = '#6e271a';
    g.fillRect(0, 0, w, h);
    const tileH = 16;
    const tileW = 21;
    for (let r = 0; r < h / tileH; r++) {
      const y = r * tileH;
      const offset = (r % 2) * (tileW / 2);
      for (let x = -tileW; x < w + tileW; x += tileW) {
        const bx = x + offset;
        g.fillStyle = (r + Math.floor(x / tileW)) % 2 === 0 ? '#bd5438' : '#ab482f';
        g.beginPath();
        g.roundRect(bx + 1, y + 1, tileW - 2, tileH - 2, [0, 0, 6, 6]);
        g.fill();
        g.fillStyle = 'rgba(255, 255, 255, 0.15)';
        g.fillRect(bx + 3, y + 2, tileW - 6, 2);
      }
    }
  });

  // 4. Carnival Red & Cream Striped Canopy
  const redCanopy = getTexture(ctx, 'tex_bld_red_canopy', 128, 64, (g, w, h) => {
    const stripeW = 16;
    for (let x = 0; x < w; x += stripeW) {
      g.fillStyle = (x / stripeW) % 2 === 0 ? '#c92a2a' : '#f8f1de';
      g.fillRect(x, 0, stripeW, h);
      // Soft shadow fold
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.fillRect(x + stripeW - 2, 0, 2, h);
    }
  });

  // 5. Fresh Teal & Cream Striped Canopy
  const tealCanopy = getTexture(ctx, 'tex_bld_teal_canopy', 128, 64, (g, w, h) => {
    const stripeW = 16;
    for (let x = 0; x < w; x += stripeW) {
      g.fillStyle = (x / stripeW) % 2 === 0 ? '#1f9d8b' : '#faf4e3';
      g.fillRect(x, 0, stripeW, h);
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.fillRect(x + stripeW - 2, 0, 2, h);
    }
  });

  // 6. Vibrant Retro Soda Splash Cup Wrap
  const cupWrap = getTexture(ctx, 'tex_bld_cup_wrap', 256, 128, (g, w, h) => {
    g.fillStyle = '#0284c7'; // Vivid cyan-blue cup
    g.fillRect(0, 0, w, h);
    // Retro diagonal wave stripes
    g.fillStyle = '#f43f5e'; // Bright punch pink wave
    g.beginPath();
    g.moveTo(0, 70);
    g.bezierCurveTo(80, 20, 160, 110, 256, 60);
    g.lineTo(256, 95);
    g.bezierCurveTo(160, 145, 80, 55, 0, 105);
    g.closePath();
    g.fill();

    g.fillStyle = '#fde047'; // Fresh lemon yellow accent
    g.beginPath();
    g.moveTo(0, 45);
    g.bezierCurveTo(70, 5, 170, 90, 256, 35);
    g.lineTo(256, 45);
    g.bezierCurveTo(170, 100, 70, 15, 0, 55);
    g.closePath();
    g.fill();

    // Carbonation bubbles
    g.fillStyle = 'rgba(255, 255, 255, 0.45)';
    const bubbles = [
      [24, 25, 4], [60, 95, 5], [110, 30, 3], [140, 85, 6],
      [190, 20, 4], [230, 90, 5], [90, 115, 3], [165, 15, 4]
    ];
    for (const [bx, by, br] of bubbles) {
      g.beginPath();
      g.arc(bx, by, br, 0, Math.PI * 2);
      g.fill();
    }
  });

  return { wood, brick, roof, redCanopy, tealCanopy, cupWrap };
}

// ---------------------------------------------------------------------------
// Facility Builder 1: Hot-Food Shop (Burger & Fries Stand)
// ---------------------------------------------------------------------------

function buildHotFoodShop(ctx, group, e, facility, textures) {
  const isOpen = facility?.open !== false;
  const name = sanitizeName(facility?.name, 'Hot Food');

  // Materials
  const matBase = getMaterial(ctx, 'mat_food_base', { color: '#4b5563', roughness: 0.85 });
  const matWood = getMaterial(ctx, 'mat_food_wood', { map: textures.wood, roughness: 0.7 });
  const matTrim = getMaterial(ctx, 'mat_food_trim', { color: '#45220c', roughness: 0.6 });
  const matAwning = getMaterial(ctx, 'mat_food_awning', { map: textures.redCanopy, roughness: 0.5 });
  const matCounter = getMaterial(ctx, 'mat_food_counter', { color: '#633918', roughness: 0.4 });
  const matGlass = getMaterial(ctx, 'mat_food_glass', { color: '#dbeafe', transparent: true, opacity: 0.35, roughness: 0.1 });
  const matInterior = getMaterial(ctx, 'mat_food_interior', { color: isOpen ? '#fef3c7' : '#1f2937', roughness: 0.8 });
  const matShutter = getMaterial(ctx, 'mat_food_shutter', { color: '#374151', roughness: 0.7 });
  const matRoof = getMaterial(ctx, 'mat_food_roof', { map: textures.roof, roughness: 0.75 });

  // Burger & Fries Sculpted Sign Materials
  const matBun = getMaterial(ctx, 'mat_sign_bun', { color: '#d99036', roughness: 0.75 });
  const matPatty = getMaterial(ctx, 'mat_sign_patty', { color: '#3d1d0e', roughness: 0.85 });
  const matCheese = getMaterial(ctx, 'mat_sign_cheese', { color: '#fbbf24', roughness: 0.45 });
  const matLettuce = getMaterial(ctx, 'mat_sign_lettuce', { color: '#22c55e', roughness: 0.65 });
  const matTomato = getMaterial(ctx, 'mat_sign_tomato', { color: '#dc2626', roughness: 0.5 });
  const matFryBox = getMaterial(ctx, 'mat_sign_fry_box', { color: '#b91c1c', roughness: 0.4 });
  const matFryStick = getMaterial(ctx, 'mat_sign_fry_stick', { color: '#facc15', roughness: 0.6 });

  // 1. Foundation Base Slab
  unitBox(ctx, group, matBase, 0, 0.1, 0, 3.5, 0.2, 3.5);

  // 2. Main Stall Walls (Timber Construction)
  // Back Wall (-X)
  unitBox(ctx, group, matWood, -1.45, 1.25, 0, 0.25, 2.1, 3.1);
  // Left Wall (-Z)
  unitBox(ctx, group, matWood, -0.15, 1.25, -1.45, 2.5, 2.1, 0.25);
  // Right Wall (+Z)
  unitBox(ctx, group, matWood, -0.15, 1.25, 1.45, 2.5, 2.1, 0.25);
  // Front Lower Wall (+X, beneath counter)
  unitBox(ctx, group, matWood, 1.25, 0.55, 0, 0.25, 0.9, 2.9);

  // Sturdy Timber Corner Posts
  unitBox(ctx, group, matTrim, -1.45, 1.25, -1.45, 0.35, 2.1, 0.35);
  unitBox(ctx, group, matTrim, -1.45, 1.25, 1.45, 0.35, 2.1, 0.35);
  unitBox(ctx, group, matTrim, 1.25, 1.25, -1.45, 0.35, 2.1, 0.35);
  unitBox(ctx, group, matTrim, 1.25, 1.25, 1.45, 0.35, 2.1, 0.35);

  // Staff back door details on back wall (-X)
  unitBox(ctx, group, matTrim, -1.58, 1.05, 0, 0.05, 1.7, 0.9);

  // 3. Front Service Counter (+X Frontage)
  // Wooden Countertop
  unitBox(ctx, group, matCounter, 1.4, 1.05, 0, 0.6, 0.1, 2.6);

  // Interior Backing
  unitBox(ctx, group, matInterior, 0.2, 1.5, 0, 1.8, 1.6, 2.5);

  if (isOpen) {
    // Sneeze-guard glass window
    unitBox(ctx, group, matGlass, 1.28, 1.6, 0, 0.04, 0.95, 2.4);
    // Cash register at service counter
    unitBox(ctx, group, matTrim, 1.38, 1.2, 0.6, 0.25, 0.18, 0.25);
    // Food warming display tray
    unitBox(ctx, group, matBase, 1.35, 1.13, -0.5, 0.3, 0.06, 0.7);
  } else {
    // Shutter pulled down (dark closed counter)
    unitBox(ctx, group, matShutter, 1.28, 1.6, 0, 0.08, 1.0, 2.5);
    // Closed notice plate hung on counter
    addLabel(ctx, group, 'CLOSED', {
      x: 1.46, y: 1.5, z: 0,
      width: 0.9, height: 0.28,
      color: '#ffffff', background: '#991b1b',
      rotation: [0, Math.PI / 2, 0]
    });
  }

  // 4. Overhanging Red/Cream Striped Awning (Front Canopy at +X)
  // Sloped canopy roof extending over counter into +X
  unitBox(ctx, group, matAwning, 1.4, 2.38, 0, 1.35, 0.08, 3.3, 0, 0, -0.2);
  // Scalloped front valance
  unitBox(ctx, group, matAwning, 2.02, 2.22, 0, 0.06, 0.26, 3.3);
  // Twin diagonal support brackets
  unitBox(ctx, group, matTrim, 1.5, 2.05, -1.45, 0.06, 0.6, 0.06, 0, 0, 0.6);
  unitBox(ctx, group, matTrim, 1.5, 2.05, 1.45, 0.06, 0.6, 0.06, 0, 0, 0.6);

  // 5. Main Roof Architecture
  unitBox(ctx, group, matRoof, -0.1, 2.45, 0, 3.5, 0.15, 3.5);
  unitBox(ctx, group, matRoof, -0.15, 2.7, 0, 3.0, 0.35, 3.0);
  unitBox(ctx, group, matRoof, -0.2, 2.95, 0, 2.3, 0.3, 2.3);

  // 6. Rooftop Layered Burger & Fries Signboard
  // Wooden mounting pedestal atop roof center
  unitBox(ctx, group, matTrim, -0.2, 3.15, 0, 1.8, 0.12, 1.8);

  // -- The Giant Burger -- (Centered at local x=-0.3, z=-0.3)
  // Bottom Bun
  unitCylinder(ctx, group, matBun, -0.3, 3.32, -0.3, 1.25, 0.22, 1.25);
  // Grilled Beef Patty
  unitCylinder(ctx, group, matPatty, -0.3, 3.48, -0.3, 1.32, 0.16, 1.32);
  // Melted Cheese (rotated square slice)
  unitBox(ctx, group, matCheese, -0.3, 3.58, -0.3, 1.22, 0.05, 1.22, 0, 0.785, 0);
  // Crisp Lettuce Layer
  unitCylinder(ctx, group, matLettuce, -0.3, 3.66, -0.3, 1.36, 0.09, 1.36);
  // Ripe Red Tomato Slices
  unitCylinder(ctx, group, matTomato, -0.48, 3.74, -0.42, 0.6, 0.06, 0.6);
  unitCylinder(ctx, group, matTomato, -0.12, 3.74, -0.18, 0.6, 0.06, 0.6);
  // Plump Rounded Top Bun
  unitSphere(ctx, group, matBun, -0.3, 3.86, -0.3, 1.26, 0.48, 1.26);

  // -- The French Fries Box -- (Leaning beside burger at x=0.0, z=0.55)
  // Red Fry Carton
  unitBox(ctx, group, matFryBox, 0.0, 3.55, 0.55, 0.55, 0.65, 0.5, 0, 0.25, 0.15);
  // French Fries Sticks
  const fries = [
    [0.02, 3.95, 0.45, 0.08, 0.45, 0.08, 0.1, 0, 0.1],
    [-0.04, 4.02, 0.52, 0.08, 0.5, 0.08, -0.15, 0, 0.2],
    [0.08, 4.08, 0.58, 0.08, 0.55, 0.08, 0.05, 0, -0.05],
    [-0.02, 4.12, 0.65, 0.08, 0.5, 0.08, 0.18, 0, 0.25],
    [0.05, 3.98, 0.70, 0.08, 0.42, 0.08, -0.1, 0, 0.15]
  ];
  for (const [fx, fy, fz, fsx, fsy, fsz, frx, fry, frz] of fries) {
    unitBox(ctx, group, matFryStick, fx, fy, fz, fsx, fsy, fsz, frx, fry, frz);
  }

  // 7. Escaped Overhead Fascia Name Label (+X Frontage)
  addLabel(ctx, group, name, {
    x: 1.28, y: 2.15, z: 0,
    width: 2.0, height: 0.38,
    color: '#ffffff', background: '#7f1d1d',
    rotation: [0, Math.PI / 2, 0]
  });
}

// ---------------------------------------------------------------------------
// Facility Builder 2: Drink Stand (Giant Colorful Soda Cup & Porch)
// ---------------------------------------------------------------------------

function buildDrinkStand(ctx, group, e, facility, textures) {
  const isOpen = facility?.open !== false;
  const name = sanitizeName(facility?.name, 'Cold Drinks');

  // Materials
  const matBase = getMaterial(ctx, 'mat_drink_base', { color: '#374151', roughness: 0.8 });
  const matCupWrap = getMaterial(ctx, 'mat_drink_cup_wrap', { map: textures.cupWrap, roughness: 0.35 });
  const matWhite = getMaterial(ctx, 'mat_drink_white', { color: '#f8fafc', roughness: 0.3 });
  const matTealCanopy = getMaterial(ctx, 'mat_drink_canopy', { map: textures.tealCanopy, roughness: 0.5 });
  const matChrome = getMaterial(ctx, 'mat_drink_chrome', { color: '#cbd5e1', metalness: 0.6, roughness: 0.25 });
  const matTealCounter = getMaterial(ctx, 'mat_drink_counter', { color: '#0f766e', roughness: 0.4 });
  const matShutter = getMaterial(ctx, 'mat_drink_shutter', { color: '#334155', roughness: 0.7 });
  const matStrawRed = getMaterial(ctx, 'mat_drink_straw_red', { color: '#ef4444', roughness: 0.3 });
  const matStrawWhite = getMaterial(ctx, 'mat_drink_straw_white', { color: '#ffffff', roughness: 0.3 });
  const matInterior = getMaterial(ctx, 'mat_drink_interior', { color: isOpen ? '#ccfbf1' : '#0f172a', roughness: 0.8 });

  // 1. Base Deck Terrace
  unitCylinder(ctx, group, matBase, 0, 0.1, 0, 3.5, 0.2, 3.5);

  // 2. Giant Soda Cup Main Architecture (Centered at x=0, z=0)
  // Tapered lower cylinder segment
  unitCylinder(ctx, group, matCupWrap, 0, 0.85, 0, 2.4, 1.3, 2.4);
  // Tapered upper cylinder segment
  unitCylinder(ctx, group, matCupWrap, 0, 1.95, 0, 2.7, 1.2, 2.7);

  // White rolled cup lip/rim
  unitCylinder(ctx, group, matWhite, 0, 2.6, 0, 2.82, 0.12, 2.82);
  // Domed plastic cup lid
  unitCylinder(ctx, group, matWhite, 0, 2.72, 0, 2.68, 0.14, 2.68);
  unitSphere(ctx, group, matWhite, 0, 2.88, 0, 2.35, 0.35, 2.35);

  // 3. Giant Bent Drinking Straw (Exits center of lid at y=3.0)
  // Straight lower straw section (striped segments)
  unitCylinder(ctx, group, matStrawWhite, 0, 3.25, 0, 0.26, 0.4, 0.26);
  unitCylinder(ctx, group, matStrawRed, 0, 3.55, 0, 0.26, 0.3, 0.26);
  unitCylinder(ctx, group, matStrawWhite, 0, 3.8, 0, 0.26, 0.3, 0.26);
  // Straw flex bend joint sphere
  unitSphere(ctx, group, matStrawRed, 0, 3.98, 0, 0.27, 0.27, 0.27);
  // Angled forward straw segment pointing towards +X frontage
  unitCylinder(ctx, group, matStrawWhite, 0.25, 4.22, 0, 0.26, 0.45, 0.26, 0, 0, -0.65);
  unitCylinder(ctx, group, matStrawRed, 0.5, 4.45, 0, 0.26, 0.35, 0.26, 0, 0, -0.65);

  // 4. Service Porch & Window Embedded at Frontage (+X)
  // Deep service counter
  unitBox(ctx, group, matTealCounter, 1.35, 1.05, 0, 0.65, 0.12, 2.3);

  // Interior backdrop
  unitBox(ctx, group, matInterior, 0.5, 1.55, 0, 1.3, 1.1, 2.1);

  if (isOpen) {
    // Twin chrome fountain dispenser heads on counter
    unitBox(ctx, group, matChrome, 1.25, 1.32, -0.5, 0.22, 0.4, 0.35);
    unitBox(ctx, group, matChrome, 1.25, 1.32, 0.5, 0.22, 0.4, 0.35);
    // Dispenser tap nozzles
    unitBox(ctx, group, matChrome, 1.38, 1.24, -0.5, 0.12, 0.08, 0.2);
    unitBox(ctx, group, matChrome, 1.38, 1.24, 0.5, 0.12, 0.08, 0.2);
    // Stack of takeaway drink cups
    unitCylinder(ctx, group, matWhite, 1.28, 1.35, -0.85, 0.14, 0.45, 0.14);
  } else {
    // Security roll-shutter over service window
    unitBox(ctx, group, matShutter, 1.22, 1.55, 0, 0.08, 0.95, 2.2);
    addLabel(ctx, group, 'CLOSED', {
      x: 1.36, y: 1.5, z: 0,
      width: 0.9, height: 0.28,
      color: '#ffffff', background: '#991b1b',
      rotation: [0, Math.PI / 2, 0]
    });
  }

  // 5. Teal & Cream Striped Porch Canopy
  unitBox(ctx, group, matTealCanopy, 1.45, 2.35, 0, 1.25, 0.08, 2.9, 0, 0, -0.2);
  unitBox(ctx, group, matTealCanopy, 2.0, 2.2, 0, 0.06, 0.24, 2.9);
  // Chrome support posts from canopy down to deck
  unitCylinder(ctx, group, matChrome, 1.95, 1.1, -1.35, 0.06, 2.2, 0.06);
  unitCylinder(ctx, group, matChrome, 1.95, 1.1, 1.35, 0.06, 2.2, 0.06);

  // 6. Escaped Name Label (+X Frontage)
  addLabel(ctx, group, name, {
    x: 1.32, y: 2.15, z: 0,
    width: 1.9, height: 0.36,
    color: '#ffffff', background: '#0f766e',
    rotation: [0, Math.PI / 2, 0]
  });
}

// ---------------------------------------------------------------------------
// Facility Builder 3: Restroom (Cream & Brick Pavilion)
// ---------------------------------------------------------------------------

function buildRestroom(ctx, group, e, facility, textures) {
  const isOpen = facility?.open !== false;
  const name = sanitizeName(facility?.name, 'Restrooms');

  // Materials
  const matPlinth = getMaterial(ctx, 'mat_rest_plinth', { color: '#6b7280', roughness: 0.85 });
  const matBrick = getMaterial(ctx, 'mat_rest_brick', { map: textures.brick, roughness: 0.85 });
  const matCream = getMaterial(ctx, 'mat_rest_cream', { color: '#f3ece0', roughness: 0.8 });
  const matQuoin = getMaterial(ctx, 'mat_rest_quoin', { color: '#9a3412', roughness: 0.8 });
  const matRoof = getMaterial(ctx, 'mat_rest_roof', { map: textures.roof, roughness: 0.75 });
  const matCornice = getMaterial(ctx, 'mat_rest_cornice', { color: '#e5e0d3', roughness: 0.65 });
  const matTrim = getMaterial(ctx, 'mat_rest_trim', { color: '#374151', roughness: 0.6 });
  const matDoor = getMaterial(ctx, 'mat_rest_door', { color: '#78350f', roughness: 0.7 });
  const matInterior = getMaterial(ctx, 'mat_rest_interior', { color: isOpen ? '#fef3c7' : '#111827', roughness: 0.9 });
  const matShrub = getMaterial(ctx, 'mat_rest_shrub', { color: '#166534', roughness: 0.85 });
  const matShrubLight = getMaterial(ctx, 'mat_rest_shrub_light', { color: '#22c55e', roughness: 0.8 });
  const matSoil = getMaterial(ctx, 'mat_rest_soil', { color: '#3f2e1e', roughness: 0.9 });

  // 1. Paved Flagstone Base Plinth
  unitBox(ctx, group, matPlinth, 0, 0.08, 0, 3.6, 0.16, 3.6);

  // 2. Main Pavilion Walls
  // Lower Brick Wainscoting (y: 0.16 to 0.9)
  unitBox(ctx, group, matBrick, 0, 0.53, 0, 3.2, 0.74, 3.1);

  // Upper Cream Stucco Walls (y: 0.9 to 2.5)
  // Back Wall (-X)
  unitBox(ctx, group, matCream, -1.45, 1.7, 0, 0.28, 1.6, 3.1);
  // Left Wall (-Z)
  unitBox(ctx, group, matCream, -0.1, 1.7, -1.42, 2.6, 1.6, 0.28);
  // Right Wall (+Z)
  unitBox(ctx, group, matCream, -0.1, 1.7, 1.42, 2.6, 1.6, 0.28);
  // Front Central Dividing Wall (+X, between bays)
  unitBox(ctx, group, matCream, 1.35, 1.7, 0, 0.28, 1.6, 0.55);

  // Corner Quoins (Staggered Brick Corner Pillars)
  const corners = [
    [-1.48, -1.45], [-1.48, 1.45],
    [1.35, -1.45], [1.35, 1.45]
  ];
  for (const [cx, cz] of corners) {
    unitBox(ctx, group, matQuoin, cx, 1.7, cz, 0.32, 1.6, 0.32);
  }

  // Classical Stone Eaves Cornice Molding
  unitBox(ctx, group, matCornice, 0, 2.55, 0, 3.45, 0.15, 3.35);

  // 3. Dual Entrance Bays (+X Frontage)
  // Bay 1: Left Entrance (z = -0.7)
  // Bay 2: Right Entrance (z = +0.7)
  const doorZ = [-0.7, 0.7];
  for (const dz of doorZ) {
    // Stone door frame posts & architrave
    unitBox(ctx, group, matCornice, 1.42, 1.5, dz - 0.42, 0.14, 1.4, 0.12);
    unitBox(ctx, group, matCornice, 1.42, 1.5, dz + 0.42, 0.14, 1.4, 0.12);
    unitBox(ctx, group, matCornice, 1.42, 2.22, dz, 0.16, 0.14, 0.94);

    // Deep interior hallway
    unitBox(ctx, group, matInterior, 0.5, 1.3, dz, 1.5, 1.5, 0.7);

    // Recessed Privacy Louver Partition Screen
    unitBox(ctx, group, matDoor, 0.7, 1.25, dz, 0.08, 1.4, 0.65);

    if (!isOpen) {
      // Barrier gate / closed panel across entrance
      unitBox(ctx, group, matTrim, 1.38, 1.1, dz, 0.08, 1.1, 0.8);
    }
  }

  if (!isOpen) {
    addLabel(ctx, group, 'CLOSED', {
      x: 1.45, y: 1.6, z: 0,
      width: 0.8, height: 0.25,
      color: '#ffffff', background: '#991b1b',
      rotation: [0, Math.PI / 2, 0]
    });
  }

  // 4. Pitched Terracotta Roof & Ornate Ridge Cresting
  unitBox(ctx, group, matRoof, 0, 2.75, 0, 3.65, 0.28, 3.55);
  unitBox(ctx, group, matRoof, 0, 3.05, 0, 3.0, 0.35, 2.85);
  unitBox(ctx, group, matRoof, 0, 3.38, 0, 2.2, 0.35, 1.95);
  // Ridge apex cresting
  unitBox(ctx, group, matTrim, 0, 3.58, 0, 1.9, 0.08, 0.16);

  // Roof Cupola / Ventilation Lantern
  unitBox(ctx, group, matCream, 0, 3.72, 0, 0.65, 0.2, 0.65);
  unitBox(ctx, group, matTrim, 0, 3.9, 0, 0.52, 0.2, 0.52);
  unitCone(ctx, group, matCornice, 0, 4.12, 0, 0.45, 0.26, 0.45);
  unitCylinder(ctx, group, matTrim, 0, 4.32, 0, 0.05, 0.2, 0.05);

  // 5. Classic Blue Restroom Signboard (+X Frontage)
  addLabel(ctx, group, name, {
    x: 1.52, y: 2.38, z: 0,
    width: 1.5, height: 0.32,
    color: '#ffffff', background: '#1d4ed8',
    rotation: [0, Math.PI / 2, 0]
  });

  // 6. Manicured Planters & Shrubs (Bounded Tile Landscaping)
  // Two brick planter boxes flanking the entrance bays
  const planterZ = [-1.42, 1.42];
  for (const pz of planterZ) {
    // Brick planter box
    unitBox(ctx, group, matBrick, 1.25, 0.28, pz, 0.65, 0.36, 0.55);
    // Dark potting soil
    unitBox(ctx, group, matSoil, 1.25, 0.45, pz, 0.55, 0.05, 0.45);
    // Spherical Boxwood Shrub
    unitSphere(ctx, group, matShrub, 1.25, 0.72, pz, 0.44, 0.44, 0.44);
    // Foliage highlight tuft
    unitSphere(ctx, group, matShrubLight, 1.2, 0.82, pz, 0.24, 0.24, 0.24);
  }
}

// ---------------------------------------------------------------------------
// Amenity Builder 1: Wooden Slatted Bench (Cast Iron Legs/Back)
// ---------------------------------------------------------------------------

function buildBench(ctx, group, e, amenity, textures) {
  // Materials
  const matIron = getMaterial(ctx, 'mat_amenity_iron', { color: '#1f2937', metalness: 0.65, roughness: 0.45 });
  const matWood = getMaterial(ctx, 'mat_amenity_slat', { map: textures.wood, roughness: 0.55 });

  // The bench is positioned along the edge of the path tile at z = 1.35
  // Width spans x: [-1.05, 1.05]
  const zSeat = 1.35;
  const zBack = 1.65;

  // 1. Cast Iron Leg Assemblies (Left x=-0.95, Center x=0, Right x=0.95)
  const legX = [-0.95, 0.0, 0.95];
  for (const lx of legX) {
    // Front vertical leg
    unitCylinder(ctx, group, matIron, lx, 0.28, zSeat - 0.2, 0.06, 0.55, 0.06, 0.1, 0, 0);
    // Rear angled leg
    unitCylinder(ctx, group, matIron, lx, 0.28, zSeat + 0.2, 0.06, 0.55, 0.06, -0.1, 0, 0);
    // Horizontal seat support bracket
    unitBox(ctx, group, matIron, lx, 0.52, zSeat, 0.08, 0.08, 0.52);
    // Reclined backrest upright support
    unitBox(ctx, group, matIron, lx, 0.85, zBack - 0.05, 0.08, 0.65, 0.08, 0.2, 0, 0);
    // Curved armrest (only on the two ends)
    if (lx !== 0.0) {
      unitBox(ctx, group, matIron, lx, 0.7, zSeat - 0.05, 0.06, 0.06, 0.42);
      unitCylinder(ctx, group, matIron, lx, 0.62, zSeat - 0.22, 0.05, 0.22, 0.05);
    }
  }

  // Under-seat longitudinal stretcher bar
  unitCylinder(ctx, group, matIron, 0, 0.22, zSeat, 0.05, 1.9, 0.05, 0, 0, Math.PI / 2);

  // 2. Wooden Slats
  // Seat Slats (4 horizontal slats along Z)
  const seatOffsets = [-0.18, -0.06, 0.06, 0.18];
  for (const dz of seatOffsets) {
    unitBox(ctx, group, matWood, 0, 0.58, zSeat + dz, 2.15, 0.06, 0.1);
  }

  // Backrest Slats (3 horizontal slats angled ergonomically)
  const backY = [0.75, 0.9, 1.05];
  const backZ = [zBack - 0.08, zBack - 0.03, zBack + 0.02];
  for (let i = 0; i < 3; i++) {
    unitBox(ctx, group, matWood, 0, backY[i], backZ[i], 2.15, 0.11, 0.05, 0.2, 0, 0);
  }
}

// ---------------------------------------------------------------------------
// Amenity Builder 2: Litter Bin (Fluted Ribs, Lid, Handles, Fill Indication)
// ---------------------------------------------------------------------------

function buildBin(ctx, group, e, amenity) {
  // Fill Ratio Calculation
  const capacity = Number(amenity?.capacity ?? 50) || 50;
  const fill = Number(amenity?.fill ?? 0);
  const ratio = Math.max(0, Math.min(1, fill / capacity));

  // Determine Fill Level Indicator Color:
  // Low (<40%): Green | Medium (40-75%): Amber | Full (>=75%): Red
  const fillHex = ratio < 0.4 ? '#22c55e' : ratio < 0.75 ? '#f59e0b' : '#ef4444';

  // Materials
  const matBinIron = getMaterial(ctx, 'mat_bin_iron', { color: '#1b382b', metalness: 0.5, roughness: 0.5 });
  const matBrass = getMaterial(ctx, 'mat_bin_brass', { color: '#d97706', metalness: 0.7, roughness: 0.3 });
  const matFill = getMaterial(ctx, `mat_bin_fill_${ratio < 0.4 ? 'g' : ratio < 0.75 ? 'a' : 'r'}`, {
    color: fillHex,
    roughness: 0.5
  });
  const matLitterPaper = getMaterial(ctx, 'mat_bin_paper', { color: '#f3f4f6', roughness: 0.7 });

  // Placed at edge of path tile along X (x = 1.35, z = 0)
  const bx = 1.35;
  const bz = 0;

  // 1. Weighted Cast-Iron Pedestal Foot
  unitCylinder(ctx, group, matBinIron, bx, 0.08, bz, 0.42, 0.16, 0.42);

  // 2. Cylindrical Ribbed Canister Body (y: 0.16 to 0.88)
  unitCylinder(ctx, group, matBinIron, bx, 0.52, bz, 0.36, 0.72, 0.36);

  // 8 Vertical Fluted Body Ribs arrayed around the circumference
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const rx = bx + Math.cos(angle) * 0.36;
    const rz = bz + Math.sin(angle) * 0.36;
    unitBox(ctx, group, matBinIron, rx, 0.52, rz, 0.05, 0.72, 0.05);
  }

  // Polished Brass Waist Ring
  unitCylinder(ctx, group, matBrass, bx, 0.88, bz, 0.38, 0.05, 0.38);

  // 3. Opening / Emptying Side Handles (Left & Right)
  unitBox(ctx, group, matBrass, bx, 0.65, bz - 0.4, 0.05, 0.16, 0.08);
  unitBox(ctx, group, matBrass, bx, 0.65, bz + 0.4, 0.05, 0.16, 0.08);

  // 4. Domed Weather Lid & Disposal Mouth Pillars (y: 0.9 to 1.32)
  // Lid Rim
  unitCylinder(ctx, group, matBinIron, bx, 0.94, bz, 0.42, 0.07, 0.42);
  // 4 Mouth Aperture Support Pillars
  const pillars = [[-0.26, -0.26], [-0.26, 0.26], [0.26, -0.26], [0.26, 0.26]];
  for (const [px, pz] of pillars) {
    unitCylinder(ctx, group, matBinIron, bx + px, 1.05, bz + pz, 0.04, 0.22, 0.04);
  }
  // Domed Lid Roof
  unitSphere(ctx, group, matBinIron, bx, 1.2, bz, 0.42, 0.2, 0.42);
  // Top Brass Finial Knob
  unitSphere(ctx, group, matBrass, bx, 1.34, bz, 0.08, 0.08, 0.08);

  // 5. Actual Fill Color Indication
  // A. Front Circular Indicator Jewel / Fill Gauge Badge on the lid collar
  unitCylinder(ctx, group, matBrass, bx + 0.4, 0.94, bz, 0.09, 0.04, 0.09, 0, 0, Math.PI / 2);
  unitCylinder(ctx, group, matFill, bx + 0.42, 0.94, bz, 0.06, 0.03, 0.06, 0, 0, Math.PI / 2);

  // B. Visible Waste Liner / Mound inside the disposal opening
  if (ratio > 0.08) {
    const trashY = 0.92 + ratio * 0.18;
    unitCylinder(ctx, group, matFill, bx, trashY, bz, 0.3, 0.08, 0.3);
  }
  // Overflowing wrapper indication when nearly or completely full
  if (ratio >= 0.85) {
    unitBox(ctx, group, matLitterPaper, bx + 0.08, 1.13, bz + 0.06, 0.12, 0.1, 0.12, 0.3, 0.2, 0.4);
  }
}

// ---------------------------------------------------------------------------
// Public API Exports (Docs / Art-Direction Contract)
// ---------------------------------------------------------------------------

/**
 * Builds an unmistakable RCT2-inspired facility building.
 *
 * @param {object} ctx - Shared scene context (tile, half, material, texture, geometry, etc.)
 * @param {THREE.Object3D} parent - Root parent group for static scene elements
 * @param {object} e - Authoritative scenery element ({ id, tile: {x,y}, height, direction })
 * @param {object} [facility] - Active facility record ({ kind, name, open, price, sales, income })
 */
export function buildFacility(ctx, parent, e, facility) {
  if (!parent || !e) return;

  const tile = ctx?.tile ?? 4;
  const half = ctx?.half ?? 2;
  const worldX = (e.tile?.x ?? 0) * tile + half;
  const worldZ = (e.tile?.y ?? 0) * tile + half;
  const worldY = ((e.height ?? 0) / 32) * tile;

  // Container group positioned at tile centre and authoritative base height
  const bGroup = new THREE.Group();
  bGroup.position.set(worldX, worldY, worldZ);

  // Frontage local +X rotated to world orientation (0 east, 1 south, 2 west, 3 north)
  const dir = Number(e.direction ?? 0);
  bGroup.rotation.y = -dir * (Math.PI / 2);

  // Preserve root parent element selection
  if (parent.userData?.selection) {
    bGroup.userData.selection = parent.userData.selection;
  } else if (e.id !== undefined) {
    bGroup.userData.selection = { kind: 'element', id: e.id };
  }

  parent.add(bGroup);

  const textures = ensureTextures(ctx);
  const kind = facility?.kind ?? e.facilityKind ?? 'food';

  if (kind === 'food') {
    buildHotFoodShop(ctx, bGroup, e, facility, textures);
  } else if (kind === 'drink') {
    buildDrinkStand(ctx, bGroup, e, facility, textures);
  } else {
    buildRestroom(ctx, bGroup, e, facility, textures);
  }
}

/**
 * Builds an authentic RCT2-inspired park amenity (bench or litter bin).
 *
 * @param {object} ctx - Shared scene context (tile, half, material, texture, geometry, etc.)
 * @param {THREE.Object3D} parent - Root parent group for static scene elements
 * @param {object} e - Authoritative scenery element ({ id, tile: {x,y}, height, direction, amenityType })
 * @param {object} [amenity] - Active amenity record ({ kind, occupant, fill, capacity })
 */
export function buildAmenity(ctx, parent, e, amenity) {
  if (!parent || !e) return;

  const tile = ctx?.tile ?? 4;
  const half = ctx?.half ?? 2;
  const worldX = (e.tile?.x ?? 0) * tile + half;
  const worldZ = (e.tile?.y ?? 0) * tile + half;
  const worldY = ((e.height ?? 0) / 32) * tile;

  const aGroup = new THREE.Group();
  aGroup.position.set(worldX, worldY, worldZ);

  const dir = Number(e.direction ?? 0);
  aGroup.rotation.y = -dir * (Math.PI / 2);

  if (parent.userData?.selection) {
    aGroup.userData.selection = parent.userData.selection;
  } else if (e.id !== undefined) {
    aGroup.userData.selection = { kind: 'element', id: e.id };
  }

  parent.add(aGroup);

  const textures = ensureTextures(ctx);
  const kind = amenity?.kind ?? amenity?.amenityType ?? e.amenityType ?? 'bench';

  if (kind === 'bench') {
    buildBench(ctx, aGroup, e, amenity, textures);
  } else {
    buildBin(ctx, aGroup, e, amenity);
  }
}
