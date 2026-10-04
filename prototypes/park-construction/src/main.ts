import './style.css';
import { Vector3 } from 'three';
import { ParkScene } from './scene';
import { candidate, catalogue, endpoint, isClosed, point, validate, type Command, type Park, type PieceKind } from './model';

const icons: Record<string,string> = {
  park:'<path d="M3 20V8l9-5 9 5v12M3 9h18M8 20v-6h8v6M7 6V3m10 3V3"/>',
  coaster:'<path d="M2 17c3 0 3-10 6-10s3 12 6 12 3-14 8-14M4 17v5m7-10v10m7-10v10"/>',
  paths:'<path d="M4 3v7a3 3 0 0 0 3 3h10a3 3 0 0 1 3 3v5M4 3h5v5a2 2 0 0 0 2 2h7a5 5 0 0 1 5 5"/>',
  terrain:'<path d="m2 19 7-12 4 7 3-5 6 10H2ZM7 11l2 2 2-2"/>',
  guests:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m2-17a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 4v4"/>',
  finance:'<path d="M3 3v18h18M7 16v-4m5 4V7m5 9V4"/>',
  save:'<path d="M4 3h13l4 4v14H3V3h1Zm3 0v6h9V3M7 21v-7h10v7"/>',
  upload:'<path d="M4 15v6h16v-6M12 17V3m-5 5 5-5 5 5"/>',
  undo:'<path d="M4 10h10a6 6 0 0 1 0 12M9 5l-5 5 5 5"/>',
  rotate:'<path d="M20 8a9 9 0 1 0 1 8m-1-8V2m0 6h-6"/>',
  home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  plus:'<path d="M12 4v16M4 12h16"/>', minus:'<path d="M4 12h16"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  play:'<path d="m8 4 13 8-13 8V4Z"/>', pause:'<path d="M7 4v16M17 4v16"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>', check:'<path d="m5 12 4 4L20 5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
};
const icon = (name:string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.info}</svg>`;
const escape = (text:string) => text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money = (value:number) => '£'+Math.round(value).toLocaleString('en-GB');
const variants = [{key:'studio',name:'Park studio'}, {key:'classic',name:'Classic command desk'}, {key:'immersive',name:'Immersive builder'}];
let variant = new URLSearchParams(location.search).get('variant') || 'classic';
if (!variants.some(v=>v.key===variant)) variant='classic';
let park:Park|undefined, mode='overview', selected:PieceKind='straight', queue=false, terrainDelta=.25, night=false, guestIndex=14;
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="park-app" data-variant="${variant}">
    <div id="world" class="world"></div>
    <header class="topbar">
      <a class="brand" href="?variant=${variant}" aria-label="Rivermere Park home"><span class="brand-mark">${icon('coaster')}</span><span><strong>COASTER TYCOON <b>3D</b></strong><small>RIVERMERE PARK</small></span></a>
      <div class="top-stats">
        <div class="top-stat">${icon('finance')}<span><small>Park funds</small><strong id="cash">£24,850</strong></span><em class="tiny-label">SANDBOX</em></div>
        <div class="top-stat">${icon('guests')}<span><small>Visitors</small><strong id="guest-count">420</strong></span><em class="stat-note">in the park</em></div>
        <div class="top-stat comfort-stat"><span class="comfort-face">☺</span><span><small>Guest comfort</small><strong id="comfort">—</strong></span><em class="stat-note">demo needs</em></div>
      </div>
      <div class="top-actions"><span class="prototype-badge">INTERACTION PROTOTYPE</span><button class="icon-button" data-action="save" title="Export park save" aria-label="Export park save">${icon('save')}</button><button class="icon-button" data-action="load" title="Import park save" aria-label="Import park save">${icon('upload')}</button><button class="avatar" data-mode="overview" title="Park overview">PF</button></div>
    </header>
    <aside class="sidebar">
      <div class="park-label"><span class="eyebrow">YOUR PARK</span><h1>Rivermere <span>Park</span></h1><p>A little adventure. A lot of possibility.</p><button class="park-status" data-action="park"><i></i><span id="park-open-label">Park is open</span><span class="status-arrow">${icon('chevron')}</span></button></div>
      <nav class="navigation" aria-label="Park management">
      ${[['overview','park','Park overview'],['coaster','coaster','Coasters'],['path','paths','Paths & queues'],['terrain','terrain','Landscape'],['guests','guests','Guests'],['finance','finance','Finances']].map(([key,glyph,label])=>`<button data-mode="${key}" aria-label="${label}" title="${label}" class="nav-button ${key==='overview'?'active':''}">${icon(glyph)}<span>${label}</span>${key==='coaster'?'<b id="ride-count">1</b>':''}</button>`).join('')}
      </nav>
      <div class="sidebar-divider"></div>
      <div class="season-card"><span class="season-icon">${icon('sun')}</span><div><strong>Summer, Year 1</strong><small>A fine day for a coaster ride</small></div><span class="temperature">24°</span></div>
      <div class="park-note"><span class="eyebrow">MAKE SOMETHING GREAT</span><h2>Your park.<br>Your possibilities.</h2><p>Build a new thrill, find a better view, or simply watch the world go by.</p><button class="primary" data-action="new">${icon('plus')}Build a coaster</button></div>
      <div class="sidebar-foot"><span class="connection-dot"></span>Independent by design<span>v0.1</span></div>
    </aside>
    <div class="scene-caption"><span class="scene-caption-icon">${icon('park')}</span><div><strong id="scene-title">Rivermere Park</strong><small id="scene-subtitle">A bird’s-eye view of your next great idea</small></div><button class="icon-button" data-action="home" title="Reset camera" aria-label="Reset camera">${icon('home')}</button></div>
    <div class="view-controls" aria-label="Camera controls"><button data-action="zoom-in" title="Zoom in" aria-label="Zoom in">${icon('plus')}</button><button data-action="zoom-out" title="Zoom out" aria-label="Zoom out">${icon('minus')}</button><span></span><button data-action="camera-rotate" title="Rotate camera" aria-label="Rotate camera">${icon('rotate')}</button><button data-action="night" title="Toggle evening light" aria-label="Toggle evening light">${icon('sun')}</button></div>
    <section class="inspector" aria-label="Park inspector">
      <div class="inspector-top"><span class="eyebrow" id="inspector-eyebrow">PARK AT A GLANCE</span><span class="inspector-dot"></span></div>
      <div id="inspector-content"></div>
    </section>
    <section id="builder" class="builder" aria-label="Construction tools" hidden>
      <div class="builder-heading"><div><span class="eyebrow" id="builder-eyebrow">COASTER CONSTRUCTION</span><h2 id="builder-title">Build your next thrill</h2></div><button class="icon-button" data-mode="overview" title="Close construction tools" aria-label="Close construction tools">×</button></div>
      <div id="track-catalogue" class="piece-catalogue">${Object.entries(catalogue).map(([kind,spec])=>`<button class="piece-button ${kind===selected?'selected':''}" data-piece="${kind}" title="${spec.detail}" aria-label="${spec.name}"><span class="piece-glyph">${spec.glyph}</span><strong>${spec.name}</strong><small>${money(spec.cost)}</small></button>`).join('')}</div>
      <div id="surface-controls" class="surface-controls" hidden><button data-surface="path" class="selected">${icon('paths')}Footpath</button><button data-surface="queue">${icon('guests')}Queue</button><button data-surface="raise">${icon('plus')}Raise land</button><button data-surface="lower">${icon('minus')}Lower land</button></div>
      <div class="build-meta"><div><span id="meta-label">Base height</span><strong id="base-height">8 m</strong></div><div><span id="meta-second-label">Direction</span><strong id="direction">North</strong></div><div><span id="meta-third-label">Section cost</span><strong id="section-cost">£90</strong></div></div>
      <div class="build-adjust"><button data-action="height-down" title="Lower the entire coaster base by 2 m">${icon('minus')}Height</button><button data-action="height-up" title="Raise the entire coaster base by 2 m">${icon('plus')}Height</button><button data-action="station-rotate" title="Rotate the station before placing it">${icon('rotate')}Rotate</button><button data-action="undo" title="Remove the last track section">${icon('undo')}Undo</button></div>
      <div id="placement-status" class="placement-status">${icon('info')}Continue from the highlighted endpoint.</div>
      <button class="primary build-primary" data-action="place">${icon('plus')}<span id="place-label">Place section</span><kbd>Enter</kbd></button>
      <p class="builder-hint" id="builder-hint">Select a section · preview clearance · place to extend</p>
    </section>
    <div class="minimap"><span class="eyebrow">PARK MAP</span><svg id="minimap-svg" viewBox="0 0 100 100" aria-label="Park minimap"><rect x="1" y="1" width="98" height="98" rx="9" fill="#b2c69b"/><path d="M60 88V15H18v65h66V34H60" fill="none" stroke="#efe7ce" stroke-width="4"/><ellipse cx="74" cy="57" rx="9" ry="13" fill="#86bac1"/><path id="mini-track" fill="none" stroke="#c75a45" stroke-width="1.8"/></svg><span class="map-compass">N ↑</span></div>
    <footer class="timebar"><div class="time-controls"><button data-action="pause" id="pause-button" aria-label="Pause park">${icon('pause')}</button>${[1,2,4].map(speed=>`<button data-speed="${speed}" class="${speed===1?'active':''}" aria-label="${speed} times speed">${speed}×</button>`).join('')}<span class="time-divider"></span><span class="time-status" id="time-status">Park time is running</span></div><div class="canvas-help"><span>Drag to orbit</span><i>·</i><span>Scroll to zoom</span><i>·</i><button data-action="help">Keyboard shortcuts</button></div></footer>
    <div class="prototype-switcher"><button data-variant-step="-1" aria-label="Previous layout">‹</button><span><small>LAYOUT EXPLORER</small><strong id="variant-name">${variants.find(v=>v.key===variant)!.name}</strong></span><button data-variant-step="1" aria-label="Next layout">›</button></div>
    <div class="toast" id="toast" role="status"></div>
    <dialog id="help-dialog"><button class="dialog-close" data-action="close-help" aria-label="Close shortcuts">×</button><span class="eyebrow">YOUR PARK, AT YOUR FINGERTIPS</span><h2>A few useful shortcuts</h2><div class="shortcut-grid"><kbd>B</kbd><span>Coaster construction</span><kbd>P</kbd><span>Paths & queues</span><kbd>T</kbd><span>Terrain tools</span><kbd>Enter</kbd><span>Place selected track section</span><kbd>⌘ / Ctrl Z</kbd><span>Remove last track section</span><kbd>Space</kbd><span>Pause or resume</span><kbd>← / →</kbd><span>Explore interface layouts</span><kbd>Esc</kbd><span>Return to park overview</span></div><p>Click the park to select a station location, stamp a path, or reshape a terrain tile.</p></dialog>
    <input type="file" id="load-input" accept="application/json,.json" hidden>
  </div>`;
const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id)! as T;
const app = document.querySelector<HTMLElement>('.park-app')!;
const worker = new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
const scene = new ParkScene($('world'));
const send = (cmd:Command) => worker.postMessage(cmd);
let toastTimer:ReturnType<typeof setTimeout>, lastInspectorRender=0, geometryRevision=0;
function toast(text:string) { $('toast').textContent=text; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3600); }
function changeVariant(step:number) {
  variant=variants[(variants.findIndex(v=>v.key===variant)+step+variants.length)%variants.length].key;
  app.dataset.variant=variant; $('variant-name').textContent=variants.find(v=>v.key===variant)!.name;
  const url=new URL(location.href); url.searchParams.set('variant',variant); history.replaceState(null,'',url); toast(`${variants.find(v=>v.key===variant)!.name} layout`);
}
function setMode(value:string) {
  mode=value; app.dataset.mode=mode;
  document.querySelectorAll<HTMLElement>('[data-mode]').forEach(el=>el.classList.toggle('active',el.dataset.mode===(mode==='ride'?'coaster':mode)));
  const building=['coaster','path','terrain'].includes(mode);
  $('builder').hidden=!building; scene.setTool(building);
  if(mode==='coaster'&&park)scene.focus(endpoint(park).start);else scene.home();
  scene.ghost.visible=mode==='coaster';
  $('track-catalogue').hidden=mode!=='coaster'; $('surface-controls').hidden=mode==='coaster';
  document.querySelectorAll<HTMLElement>('[data-surface]').forEach(el=>{const key=el.dataset.surface!;el.hidden=mode==='path'?['raise','lower'].includes(key):!['raise','lower'].includes(key);el.classList.toggle('selected',mode==='path'?key===(queue?'queue':'path'):key===(terrainDelta>0?'raise':'lower'));});
  document.querySelector<HTMLElement>('.build-adjust')!.hidden=mode!=='coaster';
  $('builder-title').textContent=mode==='coaster'?'Build your next thrill':mode==='path'?'Make the connections':'Shape the landscape';
  $('builder-eyebrow').textContent=mode==='coaster'?'COASTER CONSTRUCTION':mode==='path'?'PATHS & QUEUES':'TERRAIN EDITING';
  $('builder-hint').textContent=mode==='coaster'?'Select a section · preview clearance · place to extend':'Click a highlighted tile in the park to apply your tool';
  $('scene-title').textContent=mode==='coaster'?'Coaster workshop':mode==='path'?'Every adventure starts with a path':mode==='terrain'?'A park with a little character':'Rivermere Park';
  $('scene-subtitle').textContent=building?'Precise pieces. A park of possibilities.':'A bird’s-eye view of your next great idea';
  renderInspector(); renderBuilder();
}
function renderBuilder() {
  if (!park) return;
  const end=endpoint(park), piece=candidate(park,selected), error=validate(park,piece), spec=catalogue[selected];
  $('base-height').textContent=mode==='coaster'?`${Math.round(park.anchor.y*4)} m`:'1 × 1 tile';
  $('direction').textContent=mode==='coaster'?['North','East','South','West'][end.direction]:mode==='path'?(queue?'Queue':'Footpath'):(terrainDelta>0?'Raise +1 m':'Lower −1 m');
  $('section-cost').textContent=mode==='coaster'?money(spec.cost):mode==='path'?'£12':'£15';
  $('meta-label').textContent=mode==='coaster'?'Base height':'Brush'; $('meta-second-label').textContent=mode==='coaster'?'Direction':'Tool'; $('meta-third-label').textContent=mode==='coaster'?'Section cost':'Tile cost';
  $('placement-status').classList.toggle('invalid',mode==='coaster'&&!!error);
  $('placement-status').innerHTML=icon(mode==='coaster'&&error?'info':'check')+`<span>${escape(mode==='coaster'?(error||`${spec.name} · endpoint ${end.start.x.toFixed(0)}, ${end.start.z.toFixed(0)} · height ${(end.start.y*4).toFixed(0)} m`):'Click a highlighted tile to apply the selected tool.')}</span>`;
  const place=document.querySelector<HTMLButtonElement>('[data-action="place"]')!; place.disabled=mode==='coaster'?!!error:true;
  for(const action of ['height-up','height-down'])document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.disabled=park.rideOpen;
  document.querySelector<HTMLButtonElement>('[data-action="station-rotate"]')!.disabled=park.pieces.length>0;
  document.querySelector<HTMLButtonElement>('[data-action="undo"]')!.disabled=park.pieces.length===0;
  $('place-label').textContent=mode==='coaster'?`Place ${spec.name.toLowerCase()}`:'Click a tile in the park';
  scene.preview(selected);
}
function metrics() {
  if (!park) return {length:0,height:0}; let length=0,height=0;
  for(const piece of park.pieces) for(let j=1;j<=20;j++){ const a=point(piece,(j-1)/20),b=point(piece,j/20); length+=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)*4; height=Math.max(height,b.y*4); }
  return {length:Math.round(length),height:Math.round(height)};
}
function renderInspector() {
  if (!park) return;
  const m=metrics(), closed=isClosed(park), count=park.archived.length+(park.pieces.length?1:0);
  const rideList=park.archived.map((r,i)=>`<button class="ride-list-item" data-select="${i}"><span class="ride-swatch"></span><span><strong>${escape(r.name)}</strong><small>${r.pieces.length} sections · ${r.open?'Open':'Closed'}</small></span>${icon('chevron')}</button>`).join('');
  if(mode==='guests') {
    const guest=park.guests[guestIndex]||park.guests[0];
    $('inspector-eyebrow').textContent='GUEST JOURNEYS';
    $('inspector-content').innerHTML=guest?`<div class="guest-portrait">${icon('guests')}</div><h2>Visitor ${guestIndex+1}</h2><p class="muted">${guest.state==='shopping'?'Stopping for a snack':guest.state==='queueing'?'Looking for a little adventure':'Exploring the park'}</p><div class="thought-bubble">“${guest.hunger>.65?'I could use a snack.':'What a lovely day to be here.'}”</div><div class="detail-row"><span>Pocket money</span><strong>${money(guest.cash)}</strong></div><div class="detail-row"><span>Hunger</span><strong>${Math.round(guest.hunger*100)}%</strong></div><div class="need-meter"><i style="width:${guest.hunger*100}%"></i></div><div class="detail-row"><span>Activity</span><strong>${guest.state}</strong></div><div class="detail-row"><span>Park position</span><strong>${guest.x.toFixed(1)}, ${guest.z.toFixed(1)}</strong></div><button class="secondary full" data-action="next-guest">Meet another visitor ${icon('chevron')}</button><p class="panel-footnote">Ambient journeys illustrate guest inspection. Full queueing and ride choices are still to be validated.</p>`:'<h2>No visitors</h2>'; return;
  }
  if(mode==='finance') {
    $('inspector-eyebrow').textContent='PARK FINANCES';
    $('inspector-content').innerHTML=`<h2>A park that pays its way</h2><p class="muted">Keep an eye on the little things.</p><div class="balance-card"><small>Available funds</small><strong>${money(park.cash)}</strong><span>Money-enabled sandbox</span></div><div class="detail-row"><span>Net construction charges</span><strong class="${park.spent<0?'positive':'cost'}">${park.spent<0?'+':'−'}${money(Math.abs(park.spent))}</strong></div><div class="detail-row"><span>Demo shop sales</span><strong class="positive">+${money(park.earned)}</strong></div><div class="finance-bars"><span style="width:${Math.min(100,Math.abs(park.spent)/5000*100)}%"></span><i style="width:${Math.min(100,park.earned/500*100)}%"></i></div><p class="panel-footnote">Construction costs and demo purchases change the balance. Full loans, upkeep and park economics are outside this interaction prototype.</p><button class="secondary full" data-action="save">${icon('save')}Export this park</button>`; return;
  }
  $('inspector-eyebrow').textContent=mode==='overview'?'PARK AT A GLANCE':'SELECTED COASTER';
  $('inspector-content').innerHTML=`<div class="ride-illustration"><svg viewBox="0 0 250 112" fill="none"><path d="M12 93H238" stroke="#a8b292"/><path d="M28 91V57m28 34V30m28 61V54m28 37V72m29 19V60m28 31V26m28 65V51m28 40V71" stroke="#cec7aa" stroke-width="3"/><path d="M11 80C30 80 38 22 56 22S89 83 112 83s40-68 58-68 35 61 67 61" stroke="#e17a62" stroke-width="6"/><path d="M11 75C30 75 38 17 56 17S89 78 112 78s40-68 58-68 35 61 67 61" stroke="#ffecd0" stroke-width="2"/><rect x="50" y="8" width="16" height="9" rx="3" fill="#547a72"/></svg><span class="illustration-label">LOOPING STEEL COASTER</span></div><div class="ride-title"><h2>${escape(park.rideName)}</h2><span class="ride-status ${park.rideOpen?'open':''}">${park.rideOpen?'Open':'Closed'}</span></div><p class="muted">A signature thrill, made by you.</p><div class="ride-metrics"><div><strong>${m.length}<small>m</small></strong><span>Track length</span></div><div><strong>${m.height}<small>m</small></strong><span>Top height</span></div><div><strong>${park.pieces.length}</strong><span>Sections</span></div></div><div class="circuit-status">${icon(closed?'check':'info')}<span>${closed?'Connected circuit':'Circuit under construction'}</span></div><button class="primary full" data-action="edit">${icon('coaster')}Edit track</button><div class="paired-buttons"><button class="secondary" data-action="ride">${icon('play')}${park.rideOpen?'Close ride':'Open circuit'}</button><button class="secondary" data-action="ride-view">${icon('eye')}Ride view</button></div><div class="panel-separator"></div><div class="detail-row"><span>Rides in your park</span><strong>${count}</strong></div>${rideList}<div class="detail-row"><span>Path tiles added</span><strong>${park.paths.length}</strong></div><button class="new-ride-link" data-action="new">${icon('plus')}Build another coaster</button><p class="panel-footnote">Ride view follows the track for visual inspection. Physics and ratings are not simulated here.</p>`;
}
scene.onTile=(x,z)=> {
  if(!park) return;
  if(mode==='path') send({type:'path',x,z,queue});
  else if(mode==='terrain') send({type:'terrain',x,z,delta:terrainDelta});
  else if(mode==='coaster'&&!park.pieces.length) send({type:'anchor',x,z,direction:park.anchorDirection});
  else if(mode==='coaster') toast('Use Place section or Enter to extend from the highlighted endpoint.');
};
scene.onHover=(x,z)=>{ if(mode!=='coaster') $('placement-status').innerHTML=icon('check')+`<span>Tile ${x}, ${z} · ${mode==='path'?(queue?'queue':'footpath'):(terrainDelta>0?'raise':'lower')}</span>`; };
scene.onRide=index=>{if(index>=0)send({type:'select',value:index});setMode('ride');toast('Coaster selected · inspect or edit its track.');};
worker.onmessage=(event:MessageEvent<{park:Park;message:string;command:string}>)=> {
  park=event.data.park; const {message,command}=event.data;
  const geometryChanged=['place','undo','new','edit','height','path','terrain','load','reset','select'].includes(command);
  if(geometryChanged) geometryRevision++;
  scene.update(park,geometryChanged);
  $('cash').textContent=money(park.cash); $('guest-count').textContent=park.guests.length.toLocaleString();
  $('comfort').textContent=park.guests.length?`${Math.round(park.guests.reduce((sum,g)=>sum+1-g.hunger,0)/park.guests.length*100)}%`:'—';
  $('ride-count').textContent=String(park.archived.length+(park.pieces.length?1:0));
  $('park-open-label').textContent=park.parkOpen?'Park is open':'Park is closed'; document.querySelector('.park-status')!.classList.toggle('closed',!park.parkOpen);
  $('pause-button').innerHTML=icon(park.paused?'play':'pause'); $('pause-button').setAttribute('aria-label',park.paused?'Resume park':'Pause park');
  $('time-status').textContent=park.paused?'Park time is paused':park.speed===1?'Park time is running':`Park time · ${park.speed}× speed`;
  document.querySelectorAll<HTMLElement>('[data-speed]').forEach(el=>el.classList.toggle('active',Number(el.dataset.speed)===park!.speed));
  if(command==='new') { selected='station'; updatePieceSelection(); setMode('coaster'); }
  if(command==='load'||command==='reset')setMode('overview');if(command==='select')setMode('ride');
  if(message) toast(message);
  if(command || performance.now()-lastInspectorRender>1000){ renderInspector(); lastInspectorRender=performance.now(); }
  if(geometryChanged||command) renderBuilder();
  if(geometryChanged) {
    const path=park.pieces.flatMap(piece=>Array.from({length:12},(_,i)=>point(piece,i/12)));
    $('mini-track').setAttribute('d',path.map((p,i)=>`${i?'L':'M'}${50+p.x*1.8},${50+p.z*1.8}`).join(' '));
  }
};
worker.onerror=()=>toast('The park worker stopped. Reload to start a fresh prototype park.');
function updatePieceSelection() { document.querySelectorAll<HTMLElement>('[data-piece]').forEach(el=>el.classList.toggle('selected',el.dataset.piece===selected)); renderBuilder(); }
document.addEventListener('click',event=>{
  const button=(event.target as Element).closest<HTMLButtonElement>('button'); if(!button||button.disabled) return;
  if(button.dataset.mode) { setMode(button.dataset.mode); return; }
  if(button.dataset.piece) { selected=button.dataset.piece as PieceKind;updatePieceSelection();
    // Mouse selection returns keyboard focus to the park; keyboard activation keeps button focus.
    if(event.detail>0)scene.renderer.domElement.focus({preventScroll:true});return;}
  if(button.dataset.speed) { send({type:'speed',value:Number(button.dataset.speed)}); return; }
  if(button.dataset.select) { send({type:'select',value:Number(button.dataset.select)}); return; }
  if(button.dataset.variantStep) { changeVariant(Number(button.dataset.variantStep)); return; }
  if(button.dataset.surface) {if(['path','queue'].includes(button.dataset.surface))queue=button.dataset.surface==='queue';else terrainDelta=button.dataset.surface==='lower'?-.25:.25;document.querySelectorAll('[data-surface]').forEach(el=>el.classList.remove('selected'));button.classList.add('selected');renderBuilder();return;}
  switch(button.dataset.action) {
    case 'place': send({type:'place',kind:selected}); break;
    case 'new': send({type:'new'}); break;
    case 'undo': send({type:'undo'}); break;
    case 'edit': send({type:'edit'}); setMode('coaster'); selected='right'; updatePieceSelection(); break;
    case 'height-up': send({type:'height',value:.5}); break;
    case 'height-down': send({type:'height',value:-.5}); break;
    case 'station-rotate': if(park) send({type:'anchor',x:park.anchor.x,z:park.anchor.z,direction:(park.anchorDirection+1)%4}); break;
    case 'park': send({type:'park'}); break;
    case 'ride': send({type:'ride'}); break;
    case 'pause': send({type:'pause'}); break;
    case 'home': scene.home(); break;
    case 'zoom-in': scene.zoom(.25); break;
    case 'zoom-out': scene.zoom(-.25); break;
    case 'camera-rotate': scene.rotate(); break;
    case 'night': night=!night; scene.night(night); button.classList.toggle('active',night); break;
    case 'ride-view': if(!park||!isClosed(park)||!park.rideOpen) toast('Open a connected circuit before entering ride view.'); else scene.ride(); break;
    case 'next-guest': guestIndex=park?.guests.length?(guestIndex+37)%park.guests.length:0; renderInspector(); break;
    case 'help': $('help-dialog').getBoundingClientRect(); ($('help-dialog') as HTMLDialogElement).showModal(); break;
    case 'close-help': ($('help-dialog') as HTMLDialogElement).close(); break;
    case 'save': if(park) { const url=URL.createObjectURL(new Blob([JSON.stringify(park,null,2)],{type:'application/json'})); const link=document.createElement('a'); link.href=url; link.download='rivermere-prototype-park.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); toast('Prototype park exported. Keep the file to resume this park.'); } break;
    case 'load': $('load-input').click(); break;
  }
});
$('load-input').addEventListener('change',async()=>{
  const input=$<HTMLInputElement>('load-input'), file=input.files?.[0]; if(!file) return;
  try { if(file.size>3_000_000) throw new Error('size'); send({type:'load',state:JSON.parse(await file.text())}); } catch { toast('Could not read this park file. Choose a prototype JSON save under 3 MB.'); }
  input.value='';
});
document.addEventListener('keydown',event=>{
  if((event.target as HTMLElement).matches('input,textarea,[contenteditable]')) return;
  if(['Enter',' '].includes(event.key)&&(event.target as HTMLElement).closest('button,a,summary,select'))return;
  if(($('help-dialog') as HTMLDialogElement).open) return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){ event.preventDefault(); changeVariant(event.key==='ArrowLeft'?-1:1); }
  else if(event.key===' '){event.preventDefault();send({type:'pause'});}
  else if(event.key==='Enter'&&mode==='coaster'){event.preventDefault();send({type:'place',kind:selected});}
  else if(event.key.toLowerCase()==='z'&&(event.metaKey||event.ctrlKey)){event.preventDefault();send({type:'undo'});}
  else if(event.key.toLowerCase()==='b')setMode('coaster');
  else if(event.key.toLowerCase()==='p')setMode('path');
  else if(event.key.toLowerCase()==='t')setMode('terrain');
  else if(event.key==='Escape'){setMode('overview');scene.home();}
});
Object.assign(window,{__prototype:{scene,snapshot:()=>structuredClone(park),info:()=>({geometryRevision,variant,mode,render:scene.renderer.info.render,closed:park?isClosed(park):false}),project:(x:number,z:number,y=0)=>{scene.camera.updateMatrixWorld();const p=new Vector3(x,y,z).project(scene.camera);const rect=scene.renderer.domElement.getBoundingClientRect();return{x:rect.left+(p.x+1)/2*rect.width,y:rect.top+(1-p.y)/2*rect.height};}}});
