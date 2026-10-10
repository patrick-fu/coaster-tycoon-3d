import * as THREE from 'three';

export function buildCarouselPortal(ctx, parent, portal, ride, assets) {
  if(!assets.ready)throw new Error('Carousel portal materials are unavailable.');
  const isExit=portal.role==='exit',m=assets.materials;
  const [timber,boards,brass,red,cream,ink,yellow,canvCream]=['timber','boards','brass','paint_red','cream','ink','canvas_yellow','canvas_cream'].map(key=>{if(!m[key])throw new Error('Carousel material is missing: '+key);return m[key];});
  parent.position.set(portal.tile.x*4+2,portal.height/8,portal.tile.y*4+2);
  parent.rotation.y=Math.PI/2-portal.direction*Math.PI/2;

  // 1. Walking corridor (1.6m wide, X in [-0.8, 0.8], Z in [-2, 2], two low risers: Y.14 -> Y.27 -> Y.40)
  ctx.box(parent, boards, 0, 0.07, -1.35, 1.6, 0.14, 1.3); // Step 1: Z[-2.0, -0.7] top Y=0.14
  ctx.box(parent, boards, 0, 0.135, -0.05, 1.6, 0.27, 1.3); // Step 2: Z[-0.7, 0.6] top Y=0.27
  ctx.box(parent, boards, 0, 0.20, 1.30, 1.6, 0.40, 1.4); // Step 3: Z[0.6, 2.0] top Y=0.40
  ctx.box(parent, timber, -0.81, 0.21, 0, 0.04, 0.42, 4.0); // Side stringer curb left
  ctx.box(parent, timber, 0.81, 0.21, 0, 0.04, 0.42, 4.0); // Side stringer curb right

  // 2. Railings outside 1.2m clear passage (posts at X = +/-0.76, clear passage = 1.52m; no bar across)
  for (const side of [-0.76, 0.76]) {
    const postConfigs = [
      [-1.9, 0.14, 0.85], [-0.7, 0.27, 0.85], [0.6, 0.40, 0.85], [1.9, 0.40, 0.85]
    ];
    for (const [pz, pyBase, pHeight] of postConfigs) {
      ctx.cylinder(parent, red, side, pyBase + pHeight / 2, pz, 0.06, pHeight, 0.06);
      ctx.box(parent, brass, side, pyBase + pHeight + 0.03, pz, 0.09, 0.06, 0.09);
    }
    ctx.box(parent, brass, side, 0.95, -1.30, 0.03, 0.04, 1.2);
    ctx.box(parent, brass, side, 1.08, -0.05, 0.03, 0.04, 1.3);
    ctx.box(parent, brass, side, 1.21, 1.25, 0.03, 0.04, 1.3);
    ctx.box(parent, timber, side, 0.65, -1.30, 0.02, 0.03, 1.2);
    ctx.box(parent, timber, side, 0.78, -0.05, 0.02, 0.03, 1.3);
    ctx.box(parent, timber, side, 0.91, 1.25, 0.02, 0.03, 1.3);
  }

  // 3. Victorian entrance/exit arch & canopy double columns flanking corridor
  for (const sx of [-1, 1]) {
    for (const [cx, cz] of [[0.86, -1.6], [1.00, -1.6], [0.86, 1.6], [1.00, 1.6]]) {
      const colX = sx * cx;
      ctx.box(parent, red, colX, 0.35, cz, 0.12, 0.30, 0.12);
      ctx.cylinder(parent, cream, colX, 1.35, cz, 0.08, 1.70, 0.08);
      ctx.box(parent, brass, colX, 2.22, cz, 0.13, 0.06, 0.13);
    }
    ctx.box(parent, red, sx * 0.93, 2.27, -1.6, 0.30, 0.08, 0.18);
    ctx.box(parent, red, sx * 0.93, 2.27, 1.6, 0.30, 0.08, 0.18);
    ctx.box(parent, red, sx * 0.95, 2.34, 0, 0.14, 0.10, 3.4);
    ctx.box(parent, brass, sx * 0.95, 2.30, 0, 0.16, 0.03, 3.4);
  }

  // Transverse fascia beam & carved canopy fascia at front (Z = -1.6) and rear (Z = 1.6)
  ctx.box(parent, red, 0, 2.34, -1.6, 2.24, 0.18, 0.16);
  ctx.box(parent, brass, 0, 2.24, -1.6, 2.28, 0.04, 0.18);
  ctx.box(parent, brass, 0, 2.44, -1.6, 2.28, 0.04, 0.18);
  ctx.box(parent, red, 0, 2.34, 1.6, 2.24, 0.18, 0.16);
  ctx.box(parent, brass, 0, 2.24, 1.6, 2.28, 0.04, 0.18);

  // Front pediment gable & gold sunburst
  ctx.box(parent, cream, 0, 2.50, -1.6, 1.8, 0.14, 0.08);
  ctx.cylinder(parent, brass, 0, 2.52, -1.55, 0.22, 0.04, 0.22);

  // Alternating yellow/cream canvas canopy bays over corridor
  for (let i = 0; i < 4; i++) {
    const rz = -1.2 + i * 0.8;
    const matA = (i % 2 === 0) ? yellow : canvCream;
    const matB = (i % 2 === 0) ? canvCream : yellow;
    ctx.box(parent, matA, -0.50, 2.52, rz, 0.98, 0.06, 0.76);
    ctx.box(parent, matB, 0.50, 2.52, rz, 0.98, 0.06, 0.76);
  }
  ctx.box(parent, brass, 0, 2.62, 0, 0.08, 0.06, 3.4);
  ctx.cone(parent, brass, 0, 2.76, -1.6, 0.14, 0.24, 0.14);
  ctx.cone(parent, brass, 0, 2.76, 1.6, 0.14, 0.24, 0.14);

  // English entrance/exit sign facing incoming approach from local -Z
  ctx.text(parent, isExit ? 'EXIT' : 'ENTRANCE', {
    x: 0, y: 2.34, z: -1.71, width: 1.45, height: 0.34,
    color: '#fdf6e2', background: '#991818', rotation: [0, Math.PI, 0]
  });
  ctx.text(parent, isExit ? 'WAY OUT' : 'CAROUSEL', {
    x: 0, y: 2.34, z: -1.49, width: 1.45, height: 0.34,
    color: '#fdf6e2', background: '#991818', rotation: [0, 0, 0]
  });

  // 4. Layout & ornament differentiation beside corridor
  if (!isExit) {
    // ENTRANCE: Victorian ticket booth on RIGHT side (X around 1.38, Z around 0)
    ctx.box(parent, timber, 1.38, 0.15, 0, 0.92, 0.30, 1.4);
    ctx.box(parent, red, 1.38, 1.15, 0, 0.86, 1.70, 1.3);
    for (const [px, pz] of [[0.98, -0.62], [1.78, -0.62], [0.98, 0.62], [1.78, 0.62]]) {
      ctx.box(parent, cream, px, 1.15, pz, 0.08, 1.72, 0.08);
    }
    ctx.box(parent, brass, 0.92, 1.05, 0, 0.14, 0.05, 0.64);
    ctx.box(parent, cream, 0.94, 1.35, 0, 0.04, 0.50, 0.54);
    for (const bz of [-0.16, 0, 0.16]) {
      ctx.cylinder(parent, brass, 0.94, 1.35, bz, 0.02, 0.44, 0.02);
    }
    ctx.text(parent, 'TICKETS', {
      x: 0.94, y: 1.66, z: 0, width: 0.55, height: 0.18,
      color: '#d4af37', background: '#1a1a1a', rotation: [0, -Math.PI / 2, 0]
    });
    ctx.box(parent, red, 1.38, 2.04, 0, 0.96, 0.08, 1.44);
    ctx.box(parent, brass, 1.38, 2.10, 0, 0.98, 0.04, 1.46);
    ctx.cone(parent, yellow, 1.38, 2.42, 0, 0.88, 0.60, 0.88);
    ctx.sphere(parent, brass, 1.38, 2.76, 0, 0.12, 0.12, 0.12);
    // Victorian lantern post
    ctx.cylinder(parent, brass, 1.40, 1.05, -1.4, 0.06, 1.9, 0.06);
    ctx.box(parent, ink, 1.40, 2.05, -1.4, 0.18, 0.20, 0.18);
    ctx.sphere(parent, cream, 1.40, 2.05, -1.4, 0.14, 0.14, 0.14);

    // ENTRANCE LEFT side: Victorian ornamental floral planter & balustrade
    ctx.box(parent, red, -1.38, 0.18, 0, 0.80, 0.36, 2.4);
    ctx.box(parent, cream, -1.38, 0.38, 0, 0.84, 0.05, 2.44);
    ctx.box(parent, timber, -1.38, 0.55, 0, 0.60, 0.30, 2.1);
    ctx.box(parent, ink, -1.38, 0.72, 0, 0.52, 0.06, 2.0);
    for (const pz of [-0.7, 0, 0.7]) {
      ctx.cone(parent, yellow, -1.38, 0.88, pz, 0.28, 0.26, 0.28);
      ctx.box(parent, brass, -1.38, 1.02, pz, 0.08, 0.08, 0.08);
    }
  } else {
    // EXIT: Victorian park info/clock kiosk on LEFT side (X around -1.38, Z around 0)
    ctx.box(parent, timber, -1.38, 0.15, 0, 0.92, 0.30, 1.4);
    ctx.box(parent, cream, -1.38, 1.15, 0, 0.86, 1.70, 1.3);
    for (const [px, pz] of [[-0.98, -0.62], [-1.78, -0.62], [-0.98, 0.62], [-1.78, 0.62]]) {
      ctx.box(parent, red, px, 1.15, pz, 0.08, 1.72, 0.08);
    }
    ctx.box(parent, red, -0.94, 1.35, 0, 0.04, 0.60, 0.70);
    ctx.text(parent, 'PARK INFO', {
      x: -0.92, y: 1.55, z: 0, width: 0.58, height: 0.18,
      color: '#fdf6e2', background: '#991818', rotation: [0, Math.PI / 2, 0]
    });
    // Victorian clock facing incoming approach (-Z facade)
    ctx.box(parent, brass, -1.38, 1.70, -0.67, 0.44, 0.44, 0.06);
    ctx.box(parent, cream, -1.38, 1.70, -0.69, 0.36, 0.36, 0.04);
    ctx.box(parent, ink, -1.38, 1.70, -0.72, 0.03, 0.16, 0.02);
    ctx.box(parent, ink, -1.34, 1.70, -0.72, 0.10, 0.03, 0.02);
    // Kiosk roof & finial
    ctx.box(parent, red, -1.38, 2.04, 0, 0.96, 0.08, 1.44);
    ctx.cone(parent, canvCream, -1.38, 2.42, 0, 0.88, 0.60, 0.88);
    ctx.cone(parent, brass, -1.38, 2.76, 0, 0.10, 0.20, 0.10);

    // EXIT RIGHT side: Victorian balustrade & promenade bench
    ctx.box(parent, red, 1.38, 0.18, 0, 0.80, 0.36, 2.4);
    ctx.box(parent, cream, 1.38, 0.38, 0, 0.84, 0.05, 2.44);
    ctx.box(parent, timber, 1.38, 0.55, 0, 0.46, 0.06, 1.4);
    ctx.box(parent, timber, 1.58, 0.78, 0, 0.06, 0.40, 1.4);
    for (const bz of [-0.6, 0.6]) {
      ctx.box(parent, brass, 1.38, 0.46, bz, 0.50, 0.22, 0.06);
    }
    // Exit side turnstile stanchion (>1.2m clear passage preserved)
    ctx.cylinder(parent, brass, 0.74, 0.85, 0.7, 0.08, 0.90, 0.08);
    ctx.sphere(parent, red, 0.74, 1.32, 0.7, 0.10, 0.10, 0.10);
  }

  return parent;
}
