import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { candidate, isClosed, point, route, validate, type Park, type Piece, type PieceKind, type Vec } from './model';

const v = (p: Vec) => new T.Vector3(p.x, p.y, p.z);
const material = (color: T.ColorRepresentation, roughness = .8) => new T.MeshStandardMaterial({ color, roughness, flatShading: true });
const palette = { lawn: '#8eb56c', path: '#e5d5b0', coral: '#e65f4f', cream: '#ffefd0', dark: '#1a443d', steel: '#e8e9d4', water: '#73b7bf' };
function mesh(geometry: T.BufferGeometry, mat: T.Material, x = 0, y = 0, z = 0) { const m = new T.Mesh(geometry, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
function box(w: number, h: number, d: number, color: T.ColorRepresentation, x: number, y: number, z: number) { return mesh(new T.BoxGeometry(w, h, d), material(color), x, y, z); }
function cylinder(radius: number, h: number, color: T.ColorRepresentation, x: number, y: number, z: number) { return mesh(new T.CylinderGeometry(radius, radius, h, 8), material(color), x, y, z); }
function dispose(group: T.Group) {
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
  group.traverse(node => { if (node instanceof T.Mesh) { geometries.add(node.geometry); for (const m of Array.isArray(node.material) ? node.material : [node.material]) materials.add(m); } });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); group.clear();
}
export class ParkScene {
  renderer: T.WebGLRenderer;
  camera: T.OrthographicCamera;
  controls: OrbitControls;
  world = new T.Scene();
  track = new T.Group(); ghost = new T.Group(); paths = new T.Group(); terrain = new T.Group();
  private floor: T.InstancedMesh;
  private people: T.InstancedMesh; private heads: T.InstancedMesh;
  private train: T.Group[] = [];
  private routePoints: T.Vector3[] = [];
  private routeUps: T.Vector3[] = [];
  private oldGuests: { x: number; z: number }[] = [];
  private state?: Park;
  private frameTime = performance.now();
  private sun: T.DirectionalLight;
  private skyLight: T.HemisphereLight;
  private grid: T.GridHelper;
  private ray = new T.Raycaster();
  private plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  private hoverTile: T.Mesh;
  private building = false;
  private rideView = false;
  private selected: PieceKind = 'station';
  private pointerDown?: { x: number; y: number };
  onTile: (x: number, z: number) => void = () => {};
  onHover: (x: number, z: number) => void = () => {};
  onRide: (index:number) => void = () => {};
  constructor(public container: HTMLElement) {
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D park. Drag to orbit, wheel to zoom. Use construction controls to place track.');
    this.renderer.domElement.tabIndex=0;
    container.append(this.renderer.domElement);
    this.world.background = new T.Color('#e7efdf');
    this.skyLight=new T.HemisphereLight('#fff4d9','#75825b',2);this.world.add(this.skyLight);
    this.sun = new T.DirectionalLight('#fff2d1', 2.6); this.sun.position.set(-15, 28, 12);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = this.sun.shadow.camera.bottom = -32; this.sun.shadow.camera.right = this.sun.shadow.camera.top = 32;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 70; this.sun.shadow.bias = -.00025; this.sun.shadow.normalBias = .05; this.world.add(this.sun);
    this.camera = new T.OrthographicCamera(-25, 25, 25, -25, .1, 200); this.camera.position.set(38, 36, 40);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, .5, 1); this.controls.enableDamping = true; this.controls.dampingFactor = .08;
    this.controls.minZoom = .6; this.controls.maxZoom = 4; this.controls.maxPolarAngle = Math.PI * .43; this.controls.minPolarAngle = .2;
    this.controls.mouseButtons = { LEFT: T.MOUSE.ROTATE, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.PAN };
    this.controls.update();
    this.world.add(box(47, .65, 47, '#c7b997', 0, -.4, 0));
    this.floor = new T.InstancedMesh(new T.BoxGeometry(1, .12, 1), material(palette.lawn), 45 * 45);
    this.floor.receiveShadow = true; const matrix = new T.Matrix4();
    for (let x = -22; x <= 22; x++) for (let z = -22; z <= 22; z++) {
      const i = (x + 22) * 45 + z + 22; matrix.makeTranslation(x, -.06, z); this.floor.setMatrixAt(i, matrix);
      this.floor.setColorAt(i, new T.Color().setHSL(.235 + ((x * 11 + z * 7) % 11) * .0006, .29, .57 + ((x * x + z * z) % 7) * .003));
    }
    this.world.add(this.floor);
    this.grid = new T.GridHelper(45, 45, '#f7eed5', '#b9d799'); this.grid.position.y = .07; this.grid.visible = false;
    (this.grid.material as T.Material).transparent = true; (this.grid.material as T.Material).opacity = .32; this.world.add(this.grid);
    this.hoverTile = mesh(new T.BoxGeometry(.95, .035, .95), new T.MeshBasicMaterial({ color: '#ffe09c', transparent: true, opacity: .6 }), 0, .09, 0);
    this.hoverTile.visible = false; this.world.add(this.hoverTile);
    this.world.add(this.track, this.ghost, this.paths, this.terrain);
    this.ghost.visible = false;
    this.scenery();
    this.people = new T.InstancedMesh(new T.CapsuleGeometry(.09, .17, 2, 4), material('#ffffff'), 2000);
    this.heads = new T.InstancedMesh(new T.SphereGeometry(.077, 5, 4), material('#e5b889'), 2000);
    this.people.count = this.heads.count = 0; this.people.instanceMatrix.setUsage(T.DynamicDrawUsage); this.heads.instanceMatrix.setUsage(T.DynamicDrawUsage);
    const clothes = ['#d86951', '#e9b84b', '#66929e', '#687e48', '#d8d4c0', '#77779c'];
    for (let i = 0; i < 2000; i++) this.people.setColorAt(i, new T.Color(clothes[i % clothes.length]));
    this.world.add(this.people, this.heads);
    for (let i = 0; i < 4; i++) {
      const car = new T.Group(); car.add(box(.65, .22, .75, '#e8bb55', 0, .15, 0), box(.49, .08, .53, '#203f3b', 0, .31, 0));
      for (const x of [-.22, .22]) car.add(mesh(new T.SphereGeometry(.08, 6, 5), material('#e7b591'), x, .52, 0), box(.13, .15, .13, ['#49798e', '#e67b66', '#dadbd4', '#557e5a'][i], x, .39, 0));
      this.train.push(car); this.world.add(car);
    }
    this.renderer.domElement.addEventListener('pointerdown', event => { this.pointerDown = { x: event.clientX, y: event.clientY }; });
    this.renderer.domElement.addEventListener('pointerup', event => {
      if (event.button !== 0 || !this.pointerDown || Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y) > 5) return;
      const p = this.pick(event); if (!p) return;
      if(this.building)this.onTile(Math.round(p.x),Math.round(p.z));
      else {
        const hit=this.ray.intersectObject(this.track,true)[0];
        if(hit){let node:T.Object3D=hit.object;while(node.parent&&node.userData.rideIndex===undefined)node=node.parent;if(node.userData.rideIndex!==undefined)this.onRide(node.userData.rideIndex);}
      }
    });
    this.renderer.domElement.addEventListener('pointermove', event => {
      const p = this.pick(event); if (!p || !this.building) return;
      this.hoverTile.position.set(Math.round(p.x), .10, Math.round(p.z)); this.hoverTile.visible = Math.abs(p.x) <= 22 && Math.abs(p.z) <= 22;
      this.onHover(Math.round(p.x), Math.round(p.z));
    });
    this.renderer.domElement.addEventListener('pointerleave', () => { this.hoverTile.visible = false; });
    new ResizeObserver(() => this.resize()).observe(container); this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }
  private pick(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new T.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
    return this.ray.intersectObject(this.floor)[0]?.point || this.ray.ray.intersectPlane(this.plane, new T.Vector3());
  }
  private resize() { const w = this.container.clientWidth, h = this.container.clientHeight, aspect = w / h; this.camera.left = -23 * aspect; this.camera.right = 23 * aspect; this.camera.top = 23; this.camera.bottom = -23; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h); }
  private sign(text: string, x: number, y: number, z: number, w = 3.5) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#24493f'; ctx.fillRect(0, 0, 512, 96); ctx.fillStyle = '#fff5d9'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 65);
    const tex = new T.CanvasTexture(canvas); tex.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: tex })); sprite.position.set(x, y, z); sprite.scale.set(w, w * 96 / 512, 1); this.world.add(sprite);
  }
  private scenery() {
    for (let i = 0; i < route.length; i++) {
      const a = route[i], b = route[(i + 1) % route.length], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      const path = box(1.15, .07, length + .65, palette.path, (a.x + b.x) / 2, .045, (a.z + b.z) / 2); path.rotation.y = Math.atan2(dx, dz); this.world.add(path);
    }
    const lake = mesh(new T.CircleGeometry(1, 48), new T.MeshStandardMaterial({ color: palette.water, roughness: .28, metalness: .2 }), 11, .07, 4);
    lake.rotation.x = -Math.PI / 2; lake.scale.set(3.3, 4.7, 1); lake.receiveShadow = true; this.world.add(lake);
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; const rock = mesh(new T.IcosahedronGeometry(.3 + (i % 3) * .1, 0), material('#c9c6aa'), 11 + Math.cos(a) * 3.4, .11, 4 + Math.sin(a) * 4.8); rock.scale.y = .55; this.world.add(rock); }
    const bridge = box(6, .13, 1.1, '#b59a71', 11, .22, 8); bridge.rotation.y = .12; this.world.add(bridge);
    for (const z of [7.35, 8.65]) { this.world.add(box(6, .08, .08, '#e6e2c8', 11, .72, z)); for (let x = 8; x <= 14; x++) this.world.add(cylinder(.045, .75, '#e6e2c8', x, .43, z)); }
    for (const [x, z, color] of [[7, -12, '#efc65f'], [17, 10, '#e57963'], [17, 4, '#6fadb0'], [-17, 0, '#d89d77']] as [number, number, string][]) {
      const building = new T.Group(); building.add(box(2.2, 1.4, 2, '#f7ead0', x, .75, z));
      const roof = mesh(new T.ConeGeometry(1.85, .8, 4), material(color), x, 1.87, z); roof.rotation.y = Math.PI / 4; building.add(roof);
      building.add(box(.6, .86, .04, '#487f7c', x, .49, z + 1.03));
      for (const offset of [-.8, .8]) building.add(box(.44, .5, .05, '#97c8c1', x + offset, .87, z + 1.04));
      const awning = box(2.4, .08, .8, color, x, 1.13, z + 1.35); awning.rotation.x = .14; building.add(awning);
      for (const offset of [-1, 1]) building.add(cylinder(.04, 1.15, '#f0e4ce', x + offset, .59, z + 1.65));
      this.world.add(building);
    }
    this.sign('SUNDAE CLUB', 17, 2.7, 10, 3.1); this.sign('THE LOOKOUT', 7, 2.7, -12, 3.2);
    this.world.add(cylinder(1.8, .12, '#d2c9aa', 10, .08, -8), cylinder(1.35, .1, '#a6d6d1', 10, .16, -8), cylinder(.18, .6, '#f2e8cc', 10, .48, -8));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const jet = mesh(new T.CylinderGeometry(.025, .06, 1.05, 6), material('#b9e5e1'), 10 + Math.cos(a) * .6, .72, -8 + Math.sin(a) * .6); jet.rotation.z = Math.sin(a) * .35; jet.rotation.x = Math.cos(a) * .35; this.world.add(jet); }
    const treePositions: [number, number][] = [];
    for (let i = 0; i < 14; i++) treePositions.push([-20 + i * 3, -18 + (i % 3) * .8], [-20 + i * 3, 19 - (i % 2) * 1.4]);
    for (let i = 0; i < 10; i++) treePositions.push([-20 + (i % 2), -14 + i * 3], [21 - (i % 3), -14 + i * 3]);
    treePositions.push([7, 5], [7, 1], [11, 11], [14, -3], [11, -3], [-6, 1], [-5, 3], [-7, 7], [-16, -13], [4, -14], [15, -12]);
    const trunks = new T.InstancedMesh(new T.CylinderGeometry(.095, .13, 1.1, 6), material('#9e8060'), treePositions.length);
    const tops = new T.InstancedMesh(new T.IcosahedronGeometry(.8, 1), material('#649267'), treePositions.length);
    trunks.castShadow = tops.castShadow = true; const m = new T.Matrix4();
    treePositions.forEach(([x, z], i) => { m.compose(new T.Vector3(x, .55, z), new T.Quaternion(), new T.Vector3(1, 1, 1)); trunks.setMatrixAt(i, m); m.compose(new T.Vector3(x, 1.65 + i % 3 * .12, z), new T.Quaternion(), new T.Vector3(1, 1.3, 1)); tops.setMatrixAt(i, m); tops.setColorAt(i, new T.Color().setHSL(.29 + i % 5 * .011, .24, .34 + i % 4 * .025)); });
    this.world.add(trunks, tops);
    for (let i = 0; i < 12; i++) {
      const x = i % 2 ? 6 : -15.1, z = -7 + Math.floor(i / 2) * 3.4;
      this.world.add(box(.28, .16, .78, '#bf9670', x, .24, z), box(.12, .3, .78, '#d1ad7f', x + .18, .39, z), cylinder(.08, 1.6, '#566859', x - .3, .82, z + 1), mesh(new T.SphereGeometry(.16, 6, 4), material('#fff4c9'), x - .3, 1.65, z + 1));
    }
    for (const x of [3.1, 6.9]) { this.world.add(box(.4, 2.1, .4, '#efe5c6', x, 1.05, 18)); const flag = mesh(new T.PlaneGeometry(.65, .42), material('#e98165'), x + .3, 2.3, 18); this.world.add(flag); }
    this.world.add(box(4.3, .4, .45, palette.dark, 5, 1.86, 18)); this.sign('RIVERMERE', 5, 2.4, 18, 4.2);
    const beds = [[3,14], [7,14], [8,-9], [13,-9], [-16,9], [-16,-6]];
    for (const [x, z] of beds) { this.world.add(box(1.4, .12, .65, '#826b4b', x, .08, z)); for (let i=0;i<5;i++) this.world.add(mesh(new T.IcosahedronGeometry(.15,0), material(i%2?'#ecce72':'#d78070'), x-.5+i*.25, .25, z)); }
  }
  setTool(building: boolean) { if(building&&this.rideView)this.home();this.building = building; this.grid.visible = building; if (!building) this.hoverTile.visible = false; this.ghost.visible = building; this.renderer.domElement.style.cursor = building ? 'crosshair' : 'grab'; }
  preview(kind: PieceKind) { this.selected = kind; if (!this.state) return; dispose(this.ghost); const piece = candidate(this.state, kind); const error = validate(this.state, piece); this.drawTrack([piece], this.ghost, error ? '#d76156' : '#80d5b5', true); }
  update(park: Park, geometryChanged: boolean) {
    this.state = park;
    if(this.rideView&&(!park.rideOpen||!isClosed(park)))this.home();
    if (geometryChanged) {
      dispose(this.track);const active=new T.Group();active.userData.rideIndex=-1;this.drawTrack(park.pieces,active,palette.coral);this.track.add(active);
      park.archived.forEach((ride,index)=>{const group=new T.Group();group.userData.rideIndex=index;this.drawTrack(ride.pieces,group,'#da8056');this.track.add(group);});
      this.routePoints = park.pieces.flatMap(piece => Array.from({ length: 32 }, (_, i) => v(point(piece, i / 32))));
      this.routeUps = park.pieces.flatMap(piece => Array.from({ length: 32 }, (_, i) => {
        const t = i / 32, tangent = v(point(piece, Math.min(1,t+.005))).sub(v(point(piece,Math.max(0,t-.005)))).normalize();
        const side = piece.kind === 'loop' ? new T.Vector3(-Math.cos(piece.direction*Math.PI/2),0,-Math.sin(piece.direction*Math.PI/2)) : new T.Vector3(tangent.z,0,-tangent.x).normalize();
        return new T.Vector3().crossVectors(tangent,side).normalize();
      }));
      if (park.pieces.length) this.routePoints.push(v(point(park.pieces.at(-1)!, 1)));
      if (this.routeUps.length) this.routeUps.push(this.routeUps.at(-1)!.clone());
      dispose(this.paths);
      for (const tile of park.paths) this.paths.add(box(.94, .07, .94, tile.queue ? '#76a2a1' : palette.path, tile.x, .06 + (park.terrain[`${tile.x},${tile.z}`] || 0), tile.z));
      const matrix = new T.Matrix4();
      for (let x = -22; x <= 22; x++) for (let z = -22; z <= 22; z++) { const h = park.terrain[`${x},${z}`] || 0; matrix.makeTranslation(x, h - .06, z); this.floor.setMatrixAt((x + 22) * 45 + z + 22, matrix); }
      this.floor.instanceMatrix.needsUpdate = true;
      this.floor.computeBoundingSphere();
      this.preview(this.selected); this.renderer.shadowMap.needsUpdate = true;
    }
    this.people.count = this.heads.count = park.guests.length;
    if (this.oldGuests.length !== park.guests.length) this.oldGuests = park.guests.map(g => ({ x: g.x, z: g.z }));
  }
  private drawTrack(pieces: Piece[], group: T.Group, color: T.ColorRepresentation, ghost = false) {
    const rail = material(ghost ? color : '#fff4d4', .45), spine = material(color), supportMat = material(ghost ? color : '#dfdfc8');
    if (ghost) for (const mat of [rail, spine, supportMat]) { mat.transparent = true; mat.opacity = .55; mat.depthWrite = false; }
    const ties: { pos: T.Vector3; quat: T.Quaternion }[] = [], legs: { pos: T.Vector3; height: number }[] = [];
    pieces.forEach(piece => {
      const centre: T.Vector3[] = [], left: T.Vector3[] = [], right: T.Vector3[] = [];
      const side = new T.Vector3(-Math.cos(piece.direction * Math.PI / 2), 0, -Math.sin(piece.direction * Math.PI / 2));
      for (let i = 0; i <= 32; i++) {
        const t = i / 32, p = v(point(piece, t)), tangent = v(point(piece, Math.min(1, t + .005))).sub(v(point(piece, Math.max(0, t - .005)))).normalize();
        let lateral = side.clone();
        if (piece.kind !== 'loop') lateral = new T.Vector3(tangent.z, 0, -tangent.x).normalize();
        if (piece.kind === 'bank') lateral.applyAxisAngle(tangent, Math.sin(t * Math.PI) * Math.PI / 10);
        const up = new T.Vector3().crossVectors(tangent, lateral).normalize();
        centre.push(p.clone().addScaledVector(up, -.1)); left.push(p.clone().addScaledVector(lateral, -.34)); right.push(p.clone().addScaledVector(lateral, .34));
        if (i % 4 === 0) { const basis = new T.Matrix4().makeBasis(lateral, up, tangent); ties.push({ pos: p, quat: new T.Quaternion().setFromRotationMatrix(basis) }); }
        if (!ghost && i % 16 === 0 && p.y > .8) for (const sign of [-1, 1]) legs.push({ pos: p.clone().addScaledVector(lateral, .48), height: p.y });
      }
      for (const points of [left, right]) group.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 36, .038, 5, false), rail));
      group.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(centre), 36, .09, 6, false), spine));
      if (piece.kind === 'station' && !ghost) {
        const p = v(point(piece, .5)); const station = new T.Group(); station.position.copy(p).add(new T.Vector3(0, -.3, 0)); station.rotation.y = piece.direction * Math.PI / 2;
        station.add(box(2.2, .16, 2.3, '#e2cfaa', 0, -.05, 0), box(1.4, .12, 2.3, '#eec779', .45, 1.1, 0));
        for (const x of [-.15, 1]) for (const z of [-.9, .9]) station.add(cylinder(.05, 1.4, '#f7edce', x, .4, z)); group.add(station);
      }
    });
    if (ties.length) { const inst = new T.InstancedMesh(new T.BoxGeometry(.8, .055, .1), spine, ties.length); inst.castShadow = !ghost; const m = new T.Matrix4(); ties.forEach((tie,i) => { m.compose(tie.pos, tie.quat, new T.Vector3(1,1,1)); inst.setMatrixAt(i,m); }); group.add(inst); }
    if (legs.length) {
      const supports = new T.InstancedMesh(new T.CylinderGeometry(.045, .065, 1, 6), supportMat, legs.length), bases = new T.InstancedMesh(new T.BoxGeometry(.24,.12,.24), material('#c5c2a7'), legs.length), m = new T.Matrix4();
      supports.castShadow = true;
      legs.forEach((leg,i) => { m.compose(new T.Vector3(leg.pos.x, leg.height/2, leg.pos.z), new T.Quaternion(), new T.Vector3(1, leg.height-.12, 1)); supports.setMatrixAt(i,m); m.makeTranslation(leg.pos.x,.05,leg.pos.z); bases.setMatrixAt(i,m); }); group.add(supports,bases);
    }
  }
  home() { this.rideView = false; this.controls.enabled = true; this.camera.position.set(38,36,40); this.controls.target.set(0,.5,1); this.camera.zoom = 1; this.camera.updateProjectionMatrix(); this.controls.update(); }
  focus(p: Vec) { this.home();this.controls.target.set(p.x,p.y,p.z);this.camera.position.set(p.x+38,p.y+36,p.z+40);this.camera.zoom=1.2;this.camera.updateProjectionMatrix();this.controls.update(); }
  rotate() { const p = this.camera.position.clone().sub(this.controls.target); p.applyAxisAngle(new T.Vector3(0,1,0), Math.PI/2); this.camera.position.copy(p.add(this.controls.target)); this.controls.update(); }
  zoom(delta: number) { this.camera.zoom = T.MathUtils.clamp(this.camera.zoom + delta, .6, 4); this.camera.updateProjectionMatrix(); }
  night(active: boolean) { this.world.background = new T.Color(active?'#142b36':'#e7efdf');this.skyLight.intensity=active?.9:2;this.sun.intensity = active?.5:2.6; this.renderer.toneMappingExposure = active?1.1:1.2; this.renderer.shadowMap.needsUpdate = true; }
  ride() { this.rideView = !this.rideView; this.controls.enabled = !this.rideView; if (!this.rideView) this.home(); }
  private frame() {
    const now=performance.now(),dt=Math.min(.05,(now-this.frameTime)/1000);this.frameTime=now;this.controls.update();
    const park = this.state;
    if (park) {
      const m = new T.Matrix4(), position = new T.Vector3();
      park.guests.forEach((guest,i) => { const old = this.oldGuests[i]; old.x += (guest.x-old.x)*Math.min(1,dt*14); old.z += (guest.z-old.z)*Math.min(1,dt*14); position.set(old.x,.26,old.z); m.makeTranslation(position.x,position.y,position.z); this.people.setMatrixAt(i,m); m.makeTranslation(position.x,.47,position.z); this.heads.setMatrixAt(i,m); });
      this.people.instanceMatrix.needsUpdate = this.heads.instanceMatrix.needsUpdate = true;
      const points = this.routePoints, closed = isClosed(park);
      this.train.forEach((car,i) => {
        car.visible = closed && park.rideOpen && points.length > 1;
        if (!car.visible) return;
        const t = ((park.time * 18 - i * 4) % points.length + points.length) % points.length, index = Math.floor(t), next = (index+1)%points.length;
        car.position.copy(points[index]).lerp(points[next], t-index).add(new T.Vector3(0,.12,0));
        const tangent = points[next].clone().sub(points[index]).normalize();
        car.up.copy(this.routeUps[index]).lerp(this.routeUps[next],t-index).normalize(); car.lookAt(car.position.clone().add(tangent));
        if (this.rideView && i===0) { this.camera.position.copy(car.position).add(new T.Vector3(6,4,7)); this.camera.lookAt(car.position); this.camera.zoom = 2.4; this.camera.updateProjectionMatrix(); }
      });
    }
    this.renderer.render(this.world,this.camera);
  }
}
