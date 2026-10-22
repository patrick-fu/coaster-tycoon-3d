import {flumePieceChoices,flumeInspection} from './flume-controls.js';
import {facilityInspection,bindFacilityControls,guestHeldHtml} from './consumable-controls.js';
import {informationInspection,guestMerchandiseHtml} from './information-controls.js';
import {restroomInspection} from './restroom-controls.js';
import {atmInspection} from './atm-controls.js';
import {balloonInspection,guestBalloonHtml} from './balloon-controls.js';
import {money,operatingBalance,loanDecimal,parseLoanAmount} from './money.js';
import {ParkScene,HELD_BALLOON_PRESENTATION} from './park-scene.js';
const legacySaveSlot=new URLSearchParams(location.search).get('showcase')==='classic'?'showcase-classic':'current',saveSlots=[legacySaveSlot+'-v18',legacySaveSlot+'-v17',legacySaveSlot+'-v16',legacySaveSlot+'-v15',legacySaveSlot+'-v14',legacySaveSlot+'-v13',legacySaveSlot+'-v12',legacySaveSlot+'-v11',legacySaveSlot+'-v10',legacySaveSlot+'-v9',legacySaveSlot],saveSlot=saveSlots[0];
import {steelRules} from './content/steel-coaster.js';
import {WORKER_PROTOCOL_VERSION} from './simulation/protocol.js';
import {createContentBrowser} from './content-browser.js';
import {legacyRideContent,legacyFacilityContent,informationFacilityContent,atmContent,balloonContent,woodenRideContent,woodenRiseReturnRideContent,carouselRideContent,flumeRideContent,detailedFacilityContent,resolveContent,executableContent,historicalContentAllowed} from './content/registry.js';
const $=id=>document.getElementById(id),escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const scene=new ParkScene($('viewport')),pending=new Map();
let worker=null;
let localSaveAllowed=false,presentationUsable=false,parkEpoch=0,saveTransaction=null;
let serial=0,ready=false,packet=null,staticRevision=null,staticRequested=true,staticEpoch=0,requesting=0,tool='inspect',subtool='flat',selectedRide=0,selection=null,hover=null,quoted=null,quoteSequence=0,previewTimer=null,inspectSignature='',lastInspect=0,patrolTiles=[];
let patrolUpdate=Promise.resolve(),saveUpdate=Promise.resolve();
let libraryCatalogue=null,libraryGeneration=0,selectedRideContent=legacyRideContent();
const selectedFacilityContent={food:legacyFacilityContent('food'),drink:legacyFacilityContent('drink'),restroom:legacyFacilityContent('restroom'),information:informationFacilityContent(),atm:atmContent(),balloon:balloonContent()},selectedFacilityNames={food:'Food stand',drink:'Drink stand',restroom:'Restroom',information:'Information kiosk',atm:'Cash machine',balloon:'Balloon stall'};
const contentLibrary=createContentBrowser({isChoiceReady:choice=>scene.presentationReady(choice?.capabilities?.presentation),loadCatalogue:loadLibraryCatalogue,onChoose:content=>{
 const variant=libraryCatalogue?.variants.find(v=>v.id===content.variantId),choice=variant?.choices.find(c=>c.familyId===content.familyId&&c.modeIds.includes(content.modeId)),capabilities=choice?.capabilities;
 if(choice?.runtimeAvailable&&!scene.presentationReady(capabilities.presentation)){feedback('These models are unavailable. Choose another item or reload to try again.',true);return;}
 if(choice?.runtimeAvailable&&capabilities?.construction.kind==='fixed'&&capabilities.operation.kind==='rotation'&&capabilities.presentation.kind==='detailed-carousel'){beginRideDraft(content,variant.label);}
 else if(choice?.runtimeAvailable&&capabilities?.construction.kind==='channel'&&capabilities.operation.kind==='channel-circuit'&&capabilities.presentation.kind==='detailed-log-flume'){beginRideDraft(content,variant.label);}
 else if(choice?.runtimeAvailable&&capabilities?.construction.kind==='tracked'&&capabilities.operation.kind==='circuit'&&['procedural-coaster','detailed-wooden-coaster'].includes(capabilities.presentation.kind)){beginRideDraft(content,variant.label);}
 else if(choice?.runtimeAvailable&&capabilities?.construction.kind==='facility'&&capabilities.operation.kind==='service'&&['procedural-facility','detailed-facility'].includes(capabilities.presentation.kind)){const kind=capabilities.construction.service;if(capabilities.presentation.profileId==='detailed-gradual-restroom-v1'&&!scene.restroomPresentationReady()){feedback('The restroom model is unavailable.',true);return;}if(kind==='information'&&!scene.informationPresentationReady()){feedback('The information kiosk model is unavailable.',true);return;}if(kind==='atm'&&!scene.atmPresentationReady()){feedback('The cash machine model is unavailable.',true);return;}if(!Object.hasOwn(selectedFacilityContent,kind))return;selectedFacilityContent[kind]={...content};if(variant?.label)selectedFacilityNames[kind]=variant.label;setTool('facility');subtool=kind;contentLibrary.close();renderPalette();}
 else{feedback('This content is not available for construction.',true);return;}
 schedulePreview();feedback('Content selected. Click the park to place it.');
}});
async function loadLibraryCatalogue(){
 const generation=libraryGeneration,epoch=parkEpoch,owner=worker,current=()=>generation===libraryGeneration&&epoch===parkEpoch&&owner===worker;
 const data=await request('catalogue',null);
 if(!current())throw new Error('The park catalogue changed. Open the library again.');
 libraryCatalogue=data;
 const presentations=uniquePresentations(data.variants.flatMap(v=>v.choices.filter(c=>c.runtimeAvailable).map(c=>c.capabilities.presentation)));
 const refreshAvailability=()=>{if(!current())return;contentLibrary.refreshAvailability();if(tool==='facility')renderPalette();};
 for(const presentation of presentations)scene.qualifyPresentation(presentation).then(refreshAvailability,refreshAvailability);
 return data;
}
function contentAvailable(content,kind){
 const choice=libraryCatalogue?.variants.find(v=>v.id===content?.variantId)?.choices.find(c=>c.familyId===content?.familyId&&c.modeIds.includes(content?.modeId));
 return choice?.runtimeAvailable===true&&(kind==='ride'?choice.capabilities.construction.kind!=='facility':choice.capabilities.construction.kind==='facility'&&choice.capabilities.construction.service===kind);
}
function parkReplaced(){
 libraryGeneration++;libraryCatalogue=null;contentLibrary.invalidateCatalogue();
 selectedRideContent=legacyRideContent();
 Object.assign(selectedFacilityContent,{food:legacyFacilityContent('food'),drink:legacyFacilityContent('drink'),restroom:legacyFacilityContent('restroom'),information:informationFacilityContent(),atm:atmContent(),balloon:balloonContent()});
 Object.assign(selectedFacilityNames,{food:'Food stand',drink:'Drink stand',restroom:'Restroom',information:'Information kiosk',atm:'Cash machine',balloon:'Balloon stall'});
 selection=null;selectedRide=0;hover=null;down=null;patrolTiles=[];inspectSignature='';staticRevision=null;staticRequested=true;staticEpoch++;
 scene.heldBalloonAssets?.update(null);scene.highlight(null);invalidatePreview();setTool('inspect');
}
$('content-library').onclick=()=>contentLibrary.open({opener:$('content-library')});
const feedback=(message,error=false)=>{$('feedback').textContent=message;$('feedback').classList.toggle('error',error);$('feedback').classList.remove('hidden');};
scene.onAssetError=message=>feedback(message,true);
function contentPresentation(content,kind,version=18){
 try{const identity=executableContent(content,kind);if(version<18&&!historicalContentAllowed(identity,kind,version))return null;return resolveContent(identity).capabilities.presentation;}catch{return null;}
}
function defaultFacilityContent(kind){
 if(kind==='information')return informationFacilityContent();
 if(kind==='atm')return atmContent();
 if(kind==='balloon')return balloonContent();
 return ['food','drink','restroom'].includes(kind)?legacyFacilityContent(kind):null;
}
function uniquePresentations(values){return [...new Map(values.filter(Boolean).map(p=>[JSON.stringify(p),p])).values()];}
function classicPresentations(){return uniquePresentations([woodenRideContent(),woodenRiseReturnRideContent(),legacyRideContent(),carouselRideContent(),flumeRideContent()].map(c=>contentPresentation(c,'ride')).concat([contentPresentation(detailedFacilityContent('independent.burger'),'food'),contentPresentation(detailedFacilityContent('independent.soft-drink'),'drink'),contentPresentation(atmContent(),'atm'),contentPresentation(balloonContent(),'balloon')]));}
function parkPresentations(view){return uniquePresentations((view?.rides??[]).map(r=>contentPresentation(r.content,'ride')).concat((view?.facilities??[]).map(f=>contentPresentation(f.content,f.kind)),view?.guestBalloons?.length?[HELD_BALLOON_PRESENTATION]:[]));}
function savedPresentations(payload){
 if(typeof payload!=='string'||payload.length>64*1024*1024)return [];
 try{
  const saved=JSON.parse(payload),version=saved?.version;
  if(!Number.isInteger(version)||version<6||version>18||!Array.isArray(saved.rides)||!Array.isArray(saved.facilities))return [];
  const presentation=(instance,kind)=>{
   if(instance===null||typeof instance!=='object'||Array.isArray(instance))return null;
   const content=Object.hasOwn(instance,'content')?instance.content:version<=7?(kind==='ride'?legacyRideContent():['food','drink','restroom'].includes(kind)?legacyFacilityContent(kind):null):null;
   return contentPresentation(content,kind,version);
  };
  return uniquePresentations(saved.rides.map(r=>presentation(r,'ride')).concat(saved.facilities.map(f=>presentation(f,f?.kind)),version===18&&saved.people?.guests?.some(g=>g?.balloonColour!==null)?[HELD_BALLOON_PRESENTATION]:[]));
 }catch{return [];}
}
function commandPresentation(command){
 let p=null,instance=null,kind=null;
 if(command?.type==='create-ride')p=contentPresentation(Object.hasOwn(command,'content')?command.content:legacyRideContent(),'ride');
 else if(command?.type==='place-facility')p=contentPresentation(Object.hasOwn(command,'content')?command.content:defaultFacilityContent(command.kind),command.kind);
 else if(['append-track','place-portal'].includes(command?.type)||command?.type==='set-ride-status'&&['open','testing'].includes(command.status)){kind='ride';instance=packet?.rides.find(r=>r.id===command.ride);}
 else if(command?.type==='set-facility-open'&&command.open===true){kind='facility';instance=packet?.facilities.find(f=>f.id===command.facility);}
 if(instance)p=contentPresentation(instance.content,kind==='ride'?'ride':instance.kind);
 return{presentations:p?[p]:[],instance:instance?{kind,id:instance.id,instanceId:instance.instanceId,content:{...instance.content},epoch:parkEpoch}:null};
}
function sameInstance(expected){
 if(!expected)return true;
 const current=(expected.kind==='ride'?packet?.rides:packet?.facilities)?.find(v=>v.id===expected.id);
 return expected.epoch===parkEpoch&&!!current&&current.instanceId===expected.instanceId&&['familyId','variantId','modeId'].every(k=>current.content?.[k]===expected.content[k]);
}
async function qualifyParkPresentation(){
 if(!packet||staticRevision===null)throw new Error('The park view did not refresh. Reload the page to recover.');
 const requirements=parkPresentations(packet);await Promise.all(requirements.map(p=>scene.qualifyPresentation(p)));
 if(requirements.some(p=>!scene.presentationReady(p)))throw new Error('Required park models are unavailable. Reload to try again.');
}
async function request(type,payload,{isCurrent=()=>true,onPosted=()=>{}}={}){
 const command=type==='quote'?payload:type==='execute'?payload?.command:null,required=commandPresentation(command),owner=worker;
 const presentations=type==='load'?savedPresentations(payload):type==='new-park'&&payload===null?classicPresentations():required.presentations;
 await Promise.all(presentations.map(p=>scene.qualifyPresentation(p)));
 if(!isCurrent()||!sameInstance(required.instance))throw new Error('This action is no longer current. Choose the item again.');
 if(presentations.some(p=>!scene.presentationReady(p)))throw new Error('Required models are unavailable. This park was not changed.');
 const value=await new Promise((resolve,reject)=>{
  if(!owner||owner!==worker){reject(new Error('The park worker is unavailable. Reload to recover.'));return;}
  const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(new Error('The park did not respond. Reload the page to recover your last save.'));},20000);
  pending.set(id,{resolve,reject,timer});
  try{owner.postMessage({id,protocolVersion:WORKER_PROTOCOL_VERSION,request:{type,payload}});}catch(error){clearTimeout(timer);pending.delete(id);reject(error);return;}
  if(type==='load'||type==='new-park'){parkEpoch++;staticEpoch++;down=null;try{saveTransaction?.abort();}catch{}}
  onPosted();
 });
 if(type==='load'||type==='new-park')parkReplaced();
 return value;
}
function startWorker(){
 worker=new Worker('./simulation/browser-worker.js',{type:'module'});
 worker.onmessage=event=>{const m=event.data;if(m.protocolVersion!==WORKER_PROTOCOL_VERSION){const error=new Error('The park worker uses an unsupported protocol. Reload the page.');feedback(error.message,true);for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();return;}if(m.event==='ready'){restoreLocal();return;}if(m.event==='error'){feedback(m.error.message,true);return;}const call=pending.get(m.id);if(!call)return;clearTimeout(call.timer);pending.delete(m.id);if(m.result.ok)call.resolve(m.result.value);else call.reject(new Error(m.result.error.message,{cause:m.result.error}));};
 worker.onerror=event=>{feedback('The park could not start: '+event.message,true);for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error(event.message));}pending.clear();};
}
async function execute(command,{isCurrent:matchesIntent=()=>true}={}){
 const creating=command.type==='create-ride',actionEpoch=parkEpoch;let receipt=null,executeSent=false,creationReady=false;
 const instance=commandPresentation(command).instance,isCurrent=()=>actionEpoch===parkEpoch&&matchesIntent()&&sameInstance(instance);
 const createdViewReady=()=>staticRevision!==null&&packet?.rides.some(r=>r.id===receipt?.id&&scene.presentationReady(r.presentation))&&selectedRide===receipt?.id;
 invalidatePreview();
 try{
  if(creating){document.body.inert=true;down=null;clearTimeout(previewTimer);quoteSequence++;quoted=null;scene.ghost.clear();}
  const quote=await request('quote',command,{isCurrent});receipt=await request('execute',{command,revision:quote.revision},{isCurrent,onPosted:()=>{executeSent=true;}});
  if(actionEpoch!==parkEpoch)return receipt;
  staticRevision=null;inspectSignature='';quoted=null;
  if(creating){selectedRide=receipt.id;selection={kind:'ride',id:receipt.id};subtool=command.content?.familyId==='independent.carousel'?'entrance':'station';}
  feedback(receipt.cost?`${receipt.cost>0?'Built for':'Refund received'} ${money(Math.abs(receipt.cost))}.`:'Park updated.');
  await refresh(true);
  if(actionEpoch!==parkEpoch)return receipt;
  if(creating){creationReady=createdViewReady();if(!creationReady)throw new Error('The new ride view did not refresh. Reload the page to recover.');}
  return receipt;
 }catch(e){
  if(actionEpoch!==parkEpoch)return receipt;
  if(!executeSent&&!matchesIntent())return null;
  feedback(e.message,true);
  if(creating){
   staticRevision=null;
   if(receipt){selectedRide=receipt.id;selection={kind:'ride',id:receipt.id};}
   await refresh(true);
  if(actionEpoch!==parkEpoch)return receipt;
   creationReady=receipt?createdViewReady():staticRevision!==null&&(!executeSent||typeof e.cause?.code==='string');
   if(receipt&&creationReady){feedback('The new ride is ready.');return receipt;}
  }
  return receipt;
 }finally{if(actionEpoch===parkEpoch){if(creating)document.body.inert=!creationReady;schedulePreview();}}
}
function editPatrol(tile=null,staff=selection?.kind==='staff'?selection.id:null){
 const point=tile?{...tile}:null,intent=selection,epoch=parkEpoch,isCurrent=()=>selection===intent&&parkEpoch===epoch&&selection?.kind==='staff'&&selection.id===staff;if(staff===null)return patrolUpdate;
 patrolUpdate=patrolUpdate.then(async()=>{if(!isCurrent())return;const tiles=point?(patrolTiles.some(t=>t.x===point.x&&t.y===point.y)?patrolTiles.filter(t=>t.x!==point.x||t.y!==point.y):[...patrolTiles,point]):[];if(await execute({type:'set-staff-patrol',staff,tiles},{isCurrent})){if(isCurrent())patrolTiles=tiles;}});return patrolUpdate;
}
async function refresh(force=false){if(force){staticRequested=true;staticEpoch++;}if(!ready||(!force&&requesting))return;requesting++;const requestedEpoch=staticEpoch,requestedPark=parkEpoch,requestedWorker=worker;try{const size=packet?.side??48,next=await request('view',{bounds:{x0:0,y0:0,x1:Math.min(size-1,63),y1:Math.min(size-1,63)},includeStatic:staticRequested||staticRevision===null});if(requestedEpoch!==staticEpoch||requestedPark!==parkEpoch||requestedWorker!==worker)return;packet=next;scene.update(next);if(next.scenery&&(tool==='track'||tool==='path'))renderPalette();updateDesk();constructionContext();if(performance.now()-lastInspect>400||force){lastInspect=performance.now();await renderInspection();}if(next.scenery&&requestedEpoch===staticEpoch){staticRevision=next.commandRevision;staticRequested=false;}}catch(e){feedback(e.message,true);}finally{requesting--;}}
setInterval(()=>refresh(),50);
function updateDesk(){const s=packet;$('cash').textContent=money(s.cash);$('finance').classList.toggle('debt',s.cash<0);$('guest-count').textContent=`${s.counts.guests} guests`;$('pause').textContent=s.paused?'▶':'Ⅱ';$('park-toggle').textContent=s.parkOpen?'Park open':'Park closed';$('park-toggle').classList.toggle('closed',!s.parkOpen);const months=['March','April','May','June','July','August','September','October'],month=Math.floor(s.tick/16384);$('calendar').textContent=`${months[month%8]} · Year ${1+Math.floor(month/8)}`;$('scene-status').textContent=`${s.counts.guests} guests · ${s.counts.staff} staff`;
 const dropdown=$('ride-select');if(dropdown&&[...dropdown.options].map(o=>Number(o.value)).join(',')!==s.rides.map(r=>r.id).join(',')){dropdown.replaceChildren(...s.rides.map(r=>{const option=new Option(r.name,r.id);return option;}));dropdown.value=selectedRide;}
}
const help={inspect:['Park inspector','Select a ride, guest or staff member.'],track:['Ride construction','Choose a ride, then build its entrances or track.'],path:['Paths & queues','Click land to lay a connected path.'],facility:['Shops & facilities','Place a shop beside a public path.'],amenity:['Benches & bins','Click a public path to attach an amenity.'],staff:['Park staff','Place staff on a public path.'],terrain:['Land & water','Click land to change its height or water.'],scenery:['Scenery & gardens','Plant trees, add flower beds and build park details.'],patrol:['Staff patrol','Click owned tiles to paint this employee’s area.']};
function setTool(next){down=null;tool=next;subtool=next==='track'?(packet?.rides.find(r=>r.id===selectedRide)?.presentation.kind==='detailed-carousel'?'entrance':packet?.rides.find(r=>r.id===selectedRide)?.presentation.kind==='detailed-log-flume'?'channel':'flat'):next==='path'?'public':next==='facility'?'food':next==='amenity'?'bench':next==='staff'?'mechanic':next==='terrain'?'terrain':next==='scenery'?'tree':next;document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===next));$('tool-label').textContent=help[next][0];$('tool-help').textContent=help[next][1];scene.ghost.clear();renderPalette();schedulePreview();}
function beginRideDraft(content,name='New ride'){
 const p=contentPresentation(content,'ride');if(!p||!contentAvailable(content,'ride')||!scene.presentationReady(p)){feedback('These ride models are unavailable. Choose another ride or reload.',true);return;}
 selectedRideContent={...content};setTool('track');subtool='create-ride';contentLibrary.close();renderPalette();
 const input=$('new-ride-name');input.value=name;input.focus();schedulePreview();
}
function renderPalette(){const station=$('station-select'),stationChoice=station?.dataset.ride===String(selectedRide)?station.value:null;const draftName=tool==='track'&&subtool==='create-ride'?$('new-ride-name')?.value:undefined;let html='',ride=packet?.rides.find(r=>r.id===selectedRide);if((tool==='track'||tool==='path')&&packet&&!ride){const nextRide=packet.rides[0]?.id??0;if(selectedRide!==nextRide){selectedRide=nextRide;ride=packet.rides.find(r=>r.id===selectedRide);if(tool==='track'&&subtool!=='create-ride'||tool==='path'&&subtool==='queue'){hover=null;quoted=null;quoteSequence++;scene.ghost.clear();schedulePreview();}}}const pieces=ride?.channelProfile?.pieces??ride?.trackProfile?.pieces??steelRules.pieces;if(tool==='track'&&ride&&!['create-ride','entrance','exit'].includes(subtool)&&(ride.presentation.kind==='detailed-carousel'||!Object.hasOwn(pieces,subtool))){subtool=ride.presentation.kind==='detailed-carousel'?'entrance':ride.presentation.kind==='detailed-log-flume'?'channel':'flat';hover=null;quoted=null;quoteSequence++;scene.ghost.clear();schedulePreview();}const choices=(values)=>values.filter(([value])=>(tool!=='track'||Object.hasOwn(pieces,value))&&(tool!=='facility'||contentAvailable(selectedFacilityContent[value],value)&&scene.presentationReady(contentPresentation(selectedFacilityContent[value],value)))).map(([value,label])=>`<button data-sub="${value}" class="${value===subtool?'selected':''}">${label}</button>`).join('');const rideDropdown=()=>`<select id="ride-select" aria-label="Selected ride">${(packet?.rides??[]).map(r=>`<option value="${r.id}" ${r.id===selectedRide?'selected':''}>${escape(r.name)}</option>`).join('')}</select>`;
 if(tool==='inspect')html='<span class="muted">Click a guest to inspect their needs. Select a coaster to test, open or close it.</span>';
 if(tool==='track')html=rideDropdown()+'<button id="new-coaster">New ride</button>'+choices([['station','Station'],['flat','Straight'],['left','Left turn'],['right','Right turn'],['brake','Brakes']])+`<select id="advanced-piece" aria-label="More track pieces"><option value="">More pieces…</option>${['lift-start','lift','lift-end','drop-start','drop','drop-end','bank-start','banked','bank-end'].filter(p=>Object.hasOwn(pieces,p)).map(p=>`<option value="${p}" ${p===subtool?'selected':''}>${p.replaceAll('-',' ')}</option>`).join('')}</select><button id="build-track">Build</button><button id="remove-track">Remove last</button><button data-sub="entrance">Entrance</button><button data-sub="exit">Exit</button>`;
 if(tool==='track'&&ride?.presentation.kind==='detailed-log-flume')html=rideDropdown()+'<button id="new-coaster">New ride</button>'+flumePieceChoices(ride,subtool,escape)+'<button id="build-track">Build</button><button id="remove-track">Remove last</button><button data-sub="entrance">Entrance</button><button data-sub="exit">Exit</button>';
 if(tool==='track'&&ride?.presentation.kind==='detailed-carousel')html=rideDropdown()+'<button id="new-coaster">New ride</button><button data-sub="entrance">Entrance</button><button data-sub="exit">Exit</button><span class="muted">Place portals at the marked body sockets, then connect queue and public paths.</span>';
 if(tool==='path')html=choices([['public','Public path'],['queue','Queue path'],['park-entry','Park entrance']])+rideDropdown();
 if(tool==='facility')html=choices([['food',selectedFacilityNames.food||'Food stand'],['drink',selectedFacilityNames.drink||'Drink stand'],['restroom',selectedFacilityNames.restroom||'Restroom'],['information',selectedFacilityNames.information||'Information kiosk'],['atm',selectedFacilityNames.atm||'Cash machine'],['balloon',selectedFacilityNames.balloon||'Balloon stall']]);
 if(tool==='amenity')html=choices([['bench','Bench'],['bin','Litter bin']]);
 if(tool==='staff')html=choices([['mechanic','Mechanic'],['handyman','Handyman']]);
 if(tool==='scenery')html=choices([['tree','Trees'],['flower','Flower bed'],['hedge','Hedge'],['lamp','Lantern'],['fountain','Fountain'],['rock','Rock garden']]);
 if(tool==='terrain')html='<label>Ground <input id="ground" type="number" step="16" min="0" max="256" value="32"></label><label>Water <input id="water" type="number" step="16" min="0" max="256" value="0"></label><span class="muted">Water 0 clears the tile.</span>';
 if(tool==='patrol')html='<button id="patrol-all">Full park</button><span class="muted">Green tiles are in this employee’s patrol. Click again to remove a tile.</span>';
 if(tool==='track'&&(subtool==='entrance'||subtool==='exit'))html=rideDropdown()+'<button id="new-coaster">New ride</button>'+(ride?.presentation.kind==='detailed-carousel'?'':`<button data-sub="${ride?.channelProfile?'channel':'flat'}">Track</button>`)+`<button data-sub="entrance" class="${subtool==='entrance'?'selected':''}">Entrance</button><button data-sub="exit" class="${subtool==='exit'?'selected':''}">Exit</button><select id="station-select" data-ride="${selectedRide}" aria-label="Station section">${(scene.elements??[]).filter(e=>e.ride===selectedRide&&(e.kind==='fixed-body'||e.kind==='track'&&pieces[e.piece]?.station)&&(!ride?.channelProfile||e.id===ride.portalStations?.[subtool])).map(e=>`<option value="${e.id}">Station section ${e.id}</option>`).join('')}</select>`+(ride?.presentation.kind==='detailed-carousel'?'<span class="muted">Place portals at the marked body sockets, then connect queue and public paths.</span>':'');
 if(tool==='track'&&subtool==='create-ride')html=`<label>Ride name <input id="new-ride-name" value="${escape(draftName??'New ride')}" maxlength="80"></label><span class="muted">Click land to place the selected ride.</span>`;
 $('palette').innerHTML=html;const currentStation=$('station-select');if(currentStation&&[...currentStation.options].some(option=>option.value===stationChoice))currentStation.value=stationChoice;document.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{subtool=b.dataset.sub;renderPalette();schedulePreview();});if($('ride-select'))$('ride-select').onchange=e=>{selectedRide=Number(e.target.value);if(tool==='track'&&packet?.rides.find(r=>r.id===selectedRide)?.presentation.kind==='detailed-carousel'&&subtool!=='exit')subtool='entrance';if(tool==='track'){const chosen=packet?.rides.find(r=>r.id===selectedRide);if(chosen&&!['entrance','exit'].includes(subtool)&&chosen.presentation.kind!=='detailed-carousel'&&!Object.hasOwn(chosen.channelProfile?.pieces??chosen.trackProfile?.pieces??steelRules.pieces,subtool))subtool=chosen.channelProfile?'channel':'flat';}selection={kind:'ride',id:selectedRide};inspectSignature='';renderPalette();schedulePreview();};if($('advanced-piece'))$('advanced-piece').onchange=e=>{if(e.target.value){subtool=e.target.value;renderPalette();schedulePreview();}};if($('new-coaster'))$('new-coaster').onclick=()=>beginRideDraft(packet?.rides.find(r=>r.id===selectedRide)?.content??legacyRideContent());if($('build-track'))$('build-track').onclick=()=>{const c=commandAt(hover);if(c)execute(c);};if($('remove-track'))$('remove-track').onclick=()=>execute({type:'remove-last-track',ride:selectedRide});if($('patrol-all'))$('patrol-all').onclick=()=>editPatrol();
 for(const id of ['station-select','new-ride-name','ground','water'])if($(id))$(id).oninput=schedulePreview;
 schedulePreview();
}
function commandAt(point){const height=Number($('height').value),direction=Number($('direction').value),path=point&&(scene.elements??[]).find(e=>e.kind==='path'&&e.tile.x===point.x&&e.tile.y===point.y&&e.height===height);
 if(tool==='track'&&subtool!=='create-ride'&&!packet?.rides.some(r=>r.id===selectedRide))return null;
 if(tool==='track'&&subtool!=='create-ride'&&subtool!=='entrance'&&subtool!=='exit')return{type:'append-track',ride:selectedRide,piece:subtool};
 if(!point||point.x<0||point.y<0||point.x>255||point.y>255)return null;
 if(tool==='track'&&subtool==='create-ride'&&!contentAvailable(selectedRideContent,'ride'))return null;
 if(tool==='track'&&subtool==='create-ride')return{type:'create-ride',name:$('new-ride-name').value.trim()||'New ride',tile:point,height,direction,content:{...selectedRideContent}};
 if(tool==='track'&&(subtool==='entrance'||subtool==='exit')){const station=$('station-select');if(!station?.value||!station.selectedOptions.length)return null;return{type:'place-portal',ride:selectedRide,station:Number(station.value),role:subtool,tile:point,height,direction};}
 if(tool==='path'){if(subtool==='park-entry')return{type:'set-park-entrance',point:{...point,z:height}};return{type:'place-path',tile:point,height,queueFor:subtool==='queue'?selectedRide:null};}
 if(tool==='facility'&&(!contentAvailable(selectedFacilityContent[subtool],subtool)||!scene.presentationReady(contentPresentation(selectedFacilityContent[subtool],subtool))))return null;
 if(tool==='facility')return{type:'place-facility',name:selectedFacilityNames[subtool]||(subtool==='food'?'Food stand':subtool==='drink'?'Drink stand':'Restrooms'),kind:subtool,tile:point,height,direction,content:{...selectedFacilityContent[subtool]}};
 if(tool==='amenity')return path?{type:'place-amenity',kind:subtool,path:path.id}:null;
 if(tool==='staff')return{type:'hire-staff',role:subtool,point:{...point,z:height}};
 if(tool==='scenery')return{type:'place-scenery',sceneryType:subtool,tile:point,height};
 if(tool==='terrain')return{type:'set-terrain',tile:point,height:Number($('ground').value),water:Number($('water').value)};
 return null;
}
function invalidatePreview(){
 clearTimeout(previewTimer);previewTimer=null;quoteSequence++;quoted=null;scene.ghost.clear();
 const build=$('build-track');if(build){build.disabled=true;build.textContent='Build';}
 $('quote-status').hidden=true;$('quote-status').dataset.state='idle';$('quote-status-message').textContent='';
}
function quoteStatus(state,message){
 const status=$('quote-status');status.hidden=false;status.dataset.state=state;
 $('quote-status-badge').textContent={idle:'Placement',pending:'Checking',valid:'Ready',rejected:'Cannot build'}[state];
 $('quote-status-message').textContent=message;status.scrollTop=0;
}
let disclosureIntent = null;
function closeConstructionDetails(restoreFocus=false){
 const details=$('construction-details');details.open=false;
 if(restoreFocus&&!details.hidden&&!$('build-context').hidden)details.querySelector('summary').focus();
}
function constructionContext(){
 const ride=packet?.rides.find(r=>r.id===selectedRide),active=tool!=='inspect';
 const append=tool==='track'&&!['create-ride','entrance','exit'].includes(subtool);
 const portal=tool==='track'&&['entrance','exit'].includes(subtool);
 const height=active&&!['terrain','patrol'].includes(tool),direction=tool==='track'||tool==='facility';
 $('build-context').hidden=!active;$('cancel-build').hidden=!active;$('placement-controls').hidden=!active||tool==='patrol'||tool==='terrain';
 $('height-label').hidden=!height;$('direction-label').hidden=!direction;
 $('height').disabled=!height||append;$('direction').disabled=!direction||append;
 $('placement-controls').classList.toggle('mode-append',append);
 $('build-context').dataset.mode=append?'append':portal?'portal':'placement';
 $('build-action-tag').textContent=append?'Extend':portal?(subtool==='entrance'?'Entrance':'Exit'):tool==='path'&&subtool==='queue'?'Queue for':'Target';
 const target=tool==='track'?(subtool==='create-ride'?$('new-ride-name')?.value.trim()||'New ride':ride?.name||'No ride selected'):
  tool==='path'&&subtool==='queue'?ride?.name||'No ride selected':tool==='facility'?selectedFacilityNames[subtool]:
  tool==='patrol'?'Staff patrol':subtool.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase());
 $('build-target').textContent=target;$('build-target').title=target;$('build-target').setAttribute('aria-label',target);
 $('build-endpoint-item').hidden=!append&&!portal;
 let endpoint='';
 if(append){
  const tip=ride?.tip;
  if(tip){const bank=tip.bank*(ride.trackProfile?.motion?.bankDegrees??steelRules.motion.bankDegrees);
   endpoint=`${tip.x/32}, ${tip.y/32} · H${tip.z} · ${['East','South','West','North'][tip.direction]} · Slope ${tip.pitch===0?'level':tip.pitch>0?'up':'down'} · Bank ${bank>0?'+':''}${bank}°`;
  }else endpoint='No track endpoint';
 }else if(portal){const station=$('station-select');endpoint=station?.value!==''&&station?.selectedOptions.length?`Station section ${station.value}`:'Build a station first';}
 $('build-endpoint').textContent=endpoint;$('build-endpoint').title=endpoint;$('build-endpoint').setAttribute('aria-label',endpoint);
 $('build-endpoint-tag').textContent=portal?'Station':'Endpoint';
 const details=$('construction-details'),applicable=active&&tool!=='terrain'&&tool!=='patrol';
 const intent=JSON.stringify([tool,subtool,selectedRide,selectedRideContent,selectedFacilityContent[subtool]??null,
  target,endpoint,append?null:$('height').value,direction&&!append?$('direction').value:null]);
 if(intent!==disclosureIntent||!applicable)closeConstructionDetails();
 disclosureIntent=intent;details.hidden=!applicable;
 $('construction-detail-target').textContent=target;$('construction-detail-endpoint').textContent=endpoint||'—';
 $('position').textContent=active&&hover?`Tile ${hover.x}, ${hover.y}`:'—';
}
function cancelConstruction(){
 hover=null;down=null;invalidatePreview();setTool('inspect');
 document.querySelector('[data-tool="inspect"]').focus();
}
function schedulePreview(){
 invalidatePreview();constructionContext();
 if(document.body.inert||tool==='inspect'||tool==='patrol')return;
 if(!commandAt(hover)){quoteStatus('idle',tool==='track'&&['entrance','exit'].includes(subtool)&&!$('station-select')?.value?'Build a station first.':'Choose a location in the park.');return;}
 const generation=quoteSequence;quoteStatus('pending','Checking placement…');
 previewTimer=setTimeout(async()=>{
  if(document.body.inert||generation!==quoteSequence)return;
  const command=commandAt(hover);if(!command){invalidatePreview();return;}
  try{
   const quote=await request('quote',command,{isCurrent:()=>generation===quoteSequence&&!document.body.inert});if(generation!==quoteSequence)return;
   quoted={command,quote};scene.preview(quote.cells.length?quote.cells:hover?[{...hover,low:Number($('height').value)}]:[],true);
   const build=$('build-track');if(build){build.disabled=false;build.textContent='Build '+money(quote.cost);}
   quoteStatus('valid',`${quote.cost<0?'Refund':'Cost'} ${money(Math.abs(quote.cost))}`);
  }catch(error){
   if(generation!==quoteSequence)return;quoted=null;
   const ride=packet?.rides.find(r=>r.id===selectedRide),tip=ride?.tip;
   const point=command.type==='append-track'&&tip?{x:tip.x/32,y:tip.y/32}:hover;
   scene.preview(point?[{...point,low:command.type==='append-track'&&tip?tip.z:Number($('height').value)}]:[],false);
   quoteStatus('rejected',error.message);
  }
 },70);
}
$('cancel-build').onclick=cancelConstruction;
$('quote-status').tabIndex=0;
$('height').oninput=schedulePreview;$('direction').onchange=schedulePreview;
let down=null;
const viewport=$('viewport');
viewport.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.isPrimary===false){down=null;return;}
 down={pointerId:e.pointerId,epoch:parkEpoch,x:e.clientX,y:e.clientY,dragged:false};
});
viewport.addEventListener('pointermove',e=>{
 if(down&&e.pointerId===down.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.dragged=true;
 hover=scene.pointer(e,Number($('height').value));if(tool!=='inspect')schedulePreview();
});
const cancelPointer=e=>{if(down?.pointerId===e.pointerId)down=null;};
viewport.addEventListener('pointercancel',cancelPointer);
viewport.addEventListener('lostpointercapture',cancelPointer);
viewport.addEventListener('pointerup',async e=>{
 const gesture=down;if(!gesture||gesture.pointerId!==e.pointerId)return;down=null;
 if(document.body.inert||gesture.epoch!==parkEpoch||e.button!==0||e.isPrimary===false||gesture.dragged||Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>5)return;
 hover=scene.pointer(e,Number($('height').value));
 if(tool==='inspect'){select(scene.pick(e));return;}
 if(tool==='patrol'&&selection?.kind==='staff'&&hover){await editPatrol(hover);return;}
 const command=commandAt(hover);if(command)await execute(command);else feedback('Choose a public path at the selected height.',true);if(gesture.epoch===parkEpoch)schedulePreview();
});
function select(value){const previousRide=selectedRide;selection=value?{...value}:null;inspectSignature='';if(value?.kind==='element'){const e=scene.elements.find(e=>e.id===value.id);if(e?.kind==='track'||e?.kind==='fixed-body'){selection={kind:'ride',id:e.ride};selectedRide=e.ride;}else if(e?.kind==='facility')selection={kind:'facility',id:e.facility};}if(selection?.kind==='ride')selectedRide=selection.id;if(previousRide!==selectedRide){const dropdown=$('ride-select');if(dropdown)dropdown.value=selectedRide;if(tool==='track'&&subtool!=='create-ride'||tool==='path'&&subtool==='queue')renderPalette();}renderInspection();}
const stat=(label,value)=>`<div class="stat"><small>${escape(label)}</small><strong>${escape(value)}</strong></div>`,row=(label,value)=>`<div class="row"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`;
async function renderInspection(){if(!packet)return;const inspectionOwner=selection,inspectionEpoch=parkEpoch,isInspectionCurrent=()=>selection===inspectionOwner&&parkEpoch===inspectionEpoch,expectedSelection=selection?{...selection}:null;if($('inspection').contains(document.activeElement)&&(['INPUT','SELECT'].includes(document.activeElement.tagName)||document.activeElement.closest('.inspection-form')))return;let html='',title='Park overview',data=null;try{
 if(!selection){html=`<p class="lead">Copper Meadows</p><p class="muted">A park of your own. Build connected paths, test your coasters and keep your guests happy.</p><div class="stats">${stat('Guests',packet.counts.guests)}${stat('Staff',packet.counts.staff)}${stat('Rides',packet.rides.length)}${stat('Ground litter',packet.counts.litter)}</div><p class="section-label">Rides</p>`+packet.rides.map(r=>`<button class="ride-card" data-select-ride="${r.id}"><strong>${escape(r.name)}</strong><small>${escape(r.status)} · ${r.queue} waiting · ${money(r.income)} ticket sales</small></button>`).join('')+'<p class="section-label">Facilities</p>'+packet.facilities.map(f=>`<button class="ride-card" data-select-facility="${f.id}"><strong>${escape(f.name)}</strong><small>${f.open?'Open':'Closed'}${f.product?' · '+escape(f.product.label):''} · ${f.kind==='atm'?f.withdrawals+' withdrawals · '+money(f.cashDispensed)+' dispensed':money(f.kind==='information'?Object.values(f.products).reduce((income,p)=>income+p.income,0):f.income)+' sales'}</small></button>`).join('')+'<p class="section-label">Park staff</p>'+packet.staff.map(t=>`<button class="ride-card" data-select-staff="${t.id}"><strong>${t.role==='mechanic'?'Mechanic':'Handyman'} ${t.id}</strong><small>${t.work??'Available'} · ${t.completed} completed jobs</small></button>`).join('');}
 else if(selection.kind==='ride'){data=packet.rides.find(r=>r.id===selection.id);if(!data){scene.highlight(null);select(null);return;}title=data.presentation.kind==='detailed-carousel'?'Carousel':data.presentation.kind==='detailed-log-flume'?'Log Flume':'Coaster';if(data.presentation.kind==='detailed-log-flume'){html=flumeInspection(data,packet.boats.find(b=>b.ride===data.id),{escape,money,stat,row});}else if(data.presentation.kind==='detailed-carousel'){const session=packet.carouselSessions.find(s=>s.ride===data.id),owners=session?.seatIds??Array(16).fill(null);html=`<p class="lead">${escape(data.name)}</p><p class="muted">${data.broken?'Broken down · Waiting for a mechanic':escape(data.status)} · ${escape(data.sessionPhase)} · ${data.queue} in queue</p><div class="stats">${stat('Riders',owners.filter(id=>id!==null).length+' / 16')}${stat('Ticket sales',money(data.income))}${stat('Completed cycles',session?.completedCycles??0)}${stat('Cycle','26 seconds')}</div><div class="actions"><button id="ride-test" class="${data.status==='testing'?'active':''}" aria-pressed="${data.status==='testing'}">Test</button><button id="ride-open" class="${data.status==='open'?'active':''}" aria-pressed="${data.status==='open'}">Open</button><button id="ride-close" class="${data.status==='closed'?'active':''}" aria-pressed="${data.status==='closed'}">Close</button></div><div class="inspection-form"><label for="ride-price">Ticket</label><input id="ride-price" type="number" value="${data.price/10}" min="0" max="10" step=".1"><button id="price-apply">Set</button></div><p class="section-label">Passenger seats</p><div class="carousel-seat-grid">${owners.map((id,slot)=>`<button ${id===null?'disabled':`data-carousel-guest="${id}"`} title="Seat ${slot+1}${id===null?' · Empty':' · Guest '+id}">${slot+1}${id===null?'':' ●'}</button>`).join('')}</div><div class="actions"><button id="edit-ride">Edit entrances</button><button id="ride-remove" class="danger">Demolish</button></div>`;}else{const m=data.measured;html=`<p class="lead">${escape(data.name)}</p><p class="muted">${data.broken?'Broken down · Waiting for a mechanic':data.status==='closed'&&data.trainPhase==='running'?'Closed · Train returning':escape(data.status)} · ${data.queue} in queue</p><div class="stats">${stat('Ticket sales',money(data.income))}${stat('Track pieces',data.trackCount)}</div><div class="actions"><button id="ride-test" class="${data.status==='testing'?'active':''}" aria-pressed="${data.status==='testing'}">Test</button><button id="ride-open" class="${data.status==='open'?'active':''}" aria-pressed="${data.status==='open'}">Open</button><button id="ride-close" class="${data.status==='closed'?'active':''}" aria-pressed="${data.status==='closed'}">Close</button></div><div class="inspection-form"><label for="ride-price">Ticket</label><input id="ride-price" type="number" value="${data.price/10}" min="0" max="100" step=".1"><button id="price-apply">Set</button></div><div class="inspection-form"><label for="car-count">Cars</label><input id="car-count" type="number" value="${data.cars}" min="1" max="${data.trackProfile?.motion.maxCars??steelRules.motion.maxCars}" step="1"><button id="cars-apply">Set</button></div><button id="edit-ride">Build / edit track</button><p class="section-label">Test measurements</p>`+(m?row('Length',(m.distance/1000).toFixed(1)+' m')+row('Max speed',(m.maxSpeed*40/1000*3.6).toFixed(1)+' km/h')+row('Duration',(m.ticks/40).toFixed(1)+' s')+row('Vertical forces',(m.minVerticalG/1000).toFixed(2)+' to '+(m.maxVerticalG/1000).toFixed(2)+' g')+row('Lateral force',(m.maxLateralG/1000).toFixed(2)+' g'):'<p class="muted">Complete a test circuit to record measurements.</p>');}}
 else if(selection.kind==='facility'){data=packet.facilities.find(f=>f.id===selection.id);if(!data){scene.highlight(null);select(null);return;}title=data.kind==='balloon'?'Balloon stall':data.kind==='atm'?'Cash machine':data.kind==='information'?'Information kiosk':data.restroom?'Restroom':data.product?(data.kind==='food'?'Food stall':'Drink stall'):'Facility';html=(data.kind==='balloon'?balloonInspection:data.kind==='atm'?atmInspection:data.kind==='information'?informationInspection:data.restroom?restroomInspection:facilityInspection)(data,packet,{escape,money,stat,row});}
 else{data=await request('inspect',{kind:expectedSelection.kind,id:expectedSelection.id},{isCurrent:isInspectionCurrent});if(!isInspectionCurrent())return;if(selection.kind==='guest'){title='Guest';html=`<p class="lead">Guest ${data.id}</p><p class="muted">${escape(data.phase==='withdrawing'?'Withdrawing cash':data.phase==='using-restroom'?'Using restroom':data.phase==='restroom-exit'?'Waiting to leave restroom':data.phase)} · ${escape(data.thought.replaceAll('-',' '))}</p>`+row('Pocket cash',money(data.cash))+row('Spent',money(data.spent))+row('Withdrawn',money(data.withdrawn))+row('Completed rides',data.ridesTaken)+guestMerchandiseHtml(data,{row})+guestBalloonHtml(data,{escape,row})+guestHeldHtml(data,packet,{escape,row})+['hunger','thirst','bladder','nausea','happiness','energy'].map(k=>`<div class="need"><div class="need-label"><span>${k[0].toUpperCase()+k.slice(1)}</span><span>${Math.round(data[k]/10)}%</span></div><div class="bar ${['hunger','thirst','bladder','nausea'].includes(k)&&data[k]>650?'warning':''}"><span style="width:${data[k]/10}%"></span></div></div>`).join('');scene.highlight(data.point);}
 else if(selection.kind==='staff'){title='Staff';html=`<p class="lead">${data.role==='mechanic'?'Mechanic':'Handyman'} ${data.id}</p>`+row('Current work',data.job?.kind??data.cleanup?.kind??'Available')+row('Completed jobs',data.completed)+row('Patrol',data.patrol.length?'Assigned area':'Full park')+'<div class="actions"><button id="staff-patrol">Paint patrol</button><button id="staff-all">Full park</button><button id="staff-fire" class="danger">Dismiss</button></div><p class="muted">Work must be reachable inside the patrol area.</p>';scene.highlight(data.point);}
 else{const e=data;title=e.kind==='scenery'?({tree:'Tree',flower:'Flower bed',hedge:'Hedge',lamp:'Park lantern',fountain:'Fountain',rock:'Rock garden'}[e.sceneryType]):e.kind==='amenity'?e.amenityType==='bench'?'Bench':'Litter bin':e.kind==='portal'?e.role==='entrance'?'Ride entrance':'Ride exit':'Path';html=`<p class="lead">${title}</p>`+row('Tile',e.tile.x+', '+e.tile.y)+row('Height',e.height)+(e.kind==='amenity'?(()=>{const a=packet.amenities.find(a=>a.id===e.id);return a.kind==='bench'?row('Occupant',a.occupant??'Empty'):row('Fill',a.fill+' / '+steelRules.housekeeping.binCapacity);})():'')+'<div class="actions"><button id="element-remove" class="danger">Remove</button></div>';scene.highlight({...e.tile,z:e.height});}}
 if(!isInspectionCurrent())return;
 const signature=JSON.stringify([selection,html]);if(signature===inspectSignature)return;inspectSignature=signature;$('inspector-title').textContent=title;$('inspection').innerHTML=html;
 document.querySelectorAll('[data-select-ride]').forEach(b=>b.onclick=()=>select({kind:'ride',id:Number(b.dataset.selectRide)}));document.querySelectorAll('[data-select-staff]').forEach(b=>b.onclick=()=>select({kind:'staff',id:Number(b.dataset.selectStaff)}));document.querySelectorAll('[data-select-facility]').forEach(b=>b.onclick=()=>select({kind:'facility',id:Number(b.dataset.selectFacility)}));
 if(selection?.kind==='ride'){for(const [button,status] of [['ride-test','testing'],['ride-open','open'],['ride-close','closed']])$(button).onclick=()=>execute({type:'set-ride-status',ride:expectedSelection.id,status},{isCurrent:isInspectionCurrent});
 const priceInput=$('ride-price'),carInput=$('car-count'),expectedInstance=data.instanceId;
 const isRideCurrent=()=>isInspectionCurrent()&&packet?.rides.some(r=>r.id===expectedSelection.id&&r.instanceId===expectedInstance);
 $('price-apply').onclick=()=>{
  const current=packet?.rides.find(r=>r.id===expectedSelection.id);
  if(!isRideCurrent()||!current||!priceInput?.isConnected||$('ride-price')!==priceInput){feedback('This ride is no longer available.',true);return;}
  let price;
  try{
   if(!priceInput.reportValidity())return;
   price=parseLoanAmount(priceInput.value,Number(priceInput.max)*10);
  }catch(error){feedback(error.message.replaceAll('Loan','Ticket').replaceAll('loan','ticket'),true);return;}
  return execute({type:'set-ride-price',ride:current.id,price},{isCurrent:isRideCurrent});
 };
 if($('cars-apply'))$('cars-apply').onclick=()=>{if(!isRideCurrent()||!carInput?.isConnected||$('car-count')!==carInput){feedback('This ride is no longer available.',true);return;}const cars=Number(carInput.value);return execute({type:'set-train-cars',ride:expectedSelection.id,cars},{isCurrent:isRideCurrent});};if($('ride-remove'))$('ride-remove').onclick=async()=>{if(!isInspectionCurrent())return;if(await execute({type:'remove-ride',ride:expectedSelection.id},{isCurrent:isInspectionCurrent})&&isInspectionCurrent())select(null);};$('edit-ride').onclick=()=>{if(!isRideCurrent())return;selectedRide=expectedSelection.id;setTool('track');if(data.presentation.kind==='detailed-carousel'){subtool='entrance';renderPalette();}};document.querySelectorAll('[data-carousel-guest]').forEach(button=>button.onclick=()=>select({kind:'guest',id:Number(button.dataset.carouselGuest)}));document.querySelectorAll('[data-flume-guest]').forEach(button=>button.onclick=()=>select({kind:'guest',id:Number(button.dataset.flumeGuest)}));}
 if(selection?.kind==='facility'){bindFacilityControls({inspectedFacility:data,getPacket:()=>packet,select:value=>{if(isInspectionCurrent())select(value);},execute:command=>execute(command,{isCurrent:isInspectionCurrent}),feedback,$,money});}
 if(selection?.kind==='staff'){$('staff-fire').onclick=async()=>{if(!isInspectionCurrent())return;if(await execute({type:'fire-staff',staff:expectedSelection.id},{isCurrent:isInspectionCurrent})&&isInspectionCurrent())select(null);};$('staff-all').onclick=()=>isInspectionCurrent()&&editPatrol(null,expectedSelection.id);$('staff-patrol').onclick=()=>{if(!isInspectionCurrent())return;patrolTiles=[];for(let bit=0;bit<65536;bit++)if(data.patrol.length&&(data.patrol[bit>>>5]&(1<<(bit&31))))patrolTiles.push({x:bit%256,y:Math.floor(bit/256)});setTool('patrol');};}
 if(selection?.kind==='element')$('element-remove').onclick=async()=>{if(!isInspectionCurrent())return;const type=data.kind==='path'?'remove-path':data.kind==='amenity'?'remove-amenity':data.kind==='scenery'?'remove-scenery':'remove-portal';if(await execute({type,id:expectedSelection.id},{isCurrent:isInspectionCurrent})&&isInspectionCurrent())select(null);};
 }catch(e){if(!isInspectionCurrent())return;feedback(e.message,true);scene.highlight(null);select(null);}}
$('clear-selection').onclick=()=>{scene.highlight(null);select(null);};document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$('camera').onclick=()=>scene.overview();$('close-camera').onclick=()=>scene.close();$('pause').onclick=()=>packet&&execute({type:'set-paused',paused:!packet.paused});$('park-toggle').onclick=()=>packet&&execute({type:'set-park-open',open:!packet.parkOpen});document.querySelectorAll('[data-speed]').forEach(b=>b.onclick=async()=>{try{await request('speed',Number(b.dataset.speed));document.querySelectorAll('[data-speed]').forEach(button=>button.classList.toggle('active',button===b));}catch(e){feedback(e.message,true);}});
document.addEventListener('keydown',e=>{if(document.body.inert||document.activeElement.closest('dialog')||(e.code==='Space'&&['BUTTON','SUMMARY'].includes(document.activeElement.tagName)))return;if(e.key==='Escape'&&$('construction-details').open){e.preventDefault();closeConstructionDetails(true);return;}if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();$('pause').click();}if(e.key==='Escape'){e.preventDefault();if(tool==='inspect')select(null);else cancelConstruction();}if(!($('direction').disabled||$('direction-label').hidden)&&(e.key.toLowerCase()==='q'||e.key.toLowerCase()==='e')){const step=e.key.toLowerCase()==='q'?-1:1;$('direction').value=(Number($('direction').value)+step+4)%4;schedulePreview();}});
$('finance').onclick=()=>{if(!packet)return;const l=packet.ledger;$('finance-summary').innerHTML=`<p class="lead">${money(packet.cash)}</p><table class="finance-table"><tr><td>Ticket sales</td><td>${money(l.rideSales)}</td></tr><tr><td>Shop sales</td><td>${money(l.shopSales)}</td></tr>${[['Stock cost',l.stock],['Wages',l.wages],['Upkeep',l.upkeep],['Interest',l.interest]].map(([label,n])=>`<tr><td>${label}</td><td class="expense">− ${money(n)}</td></tr>`).join('')}<tr class="total"><td>Operating balance</td><td>${money(operatingBalance(l))}</td></tr></table>`;$('loan').value=loanDecimal(packet.loan);$('loan').max=loanDecimal(packet.maxLoan);$('loan-feedback').textContent='Maximum loan '+money(packet.maxLoan);$('finance-dialog').showModal();};
$('set-loan').onclick=async()=>{
 if(!packet)return;
 const input=$('loan');let amount;
 try{
  if(input.validity.badInput)throw new Error('Enter a valid loan amount.');
  // The native $10 spinner step is not the command's integer-tenths restriction.
  amount=parseLoanAmount(input.value,packet.maxLoan);
 }catch(error){$('loan-feedback').textContent=error.message;feedback(error.message,true);return;}
 const receipt=await execute({type:'set-loan',amount});
 $('loan-feedback').textContent=receipt?'Loan updated.':'Unable to update loan. See the park message.';
};
function db(){return new Promise((resolve,reject)=>{const req=indexedDB.open('coaster-tycoon-3d',1);req.onupgradeneeded=()=>req.result.createObjectStore('parks');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function persistLocal(){
 const epoch=parkEpoch,allowed=()=>epoch===parkEpoch&&localSaveAllowed&&presentationUsable;
 const check=()=>{if(!allowed())throw new Error('This save is no longer current, or required park models are unavailable.');};
 const task=saveUpdate.then(async()=>{
  check();const save=await request('save',null);check();const database=await db();
  try{
   check();
   await new Promise((resolve,reject)=>{
    const tx=database.transaction('parks','readwrite');saveTransaction=tx;
    const clear=()=>{if(saveTransaction===tx)saveTransaction=null;};
    tx.oncomplete=()=>{clear();resolve();};
    tx.onerror=()=>{clear();reject(tx.error??new Error('Browser save failed.'));};
    tx.onabort=()=>{clear();reject(tx.error??new Error('Browser save was aborted.'));};
    try{check();tx.objectStore('parks').put(save,saveSlot);}catch(error){try{tx.abort();}catch{}clear();reject(error);}
   });
   check();
  }finally{database.close();}
  $('save-status').textContent='Saved '+new Date().toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'});
 });
 // Recover the queue tail so one storage error cannot suppress later saves.
 saveUpdate=task.catch(()=>{});return task;
}
async function saveLocal(quiet=false){
 if(!localSaveAllowed||!presentationUsable){if(!quiet)feedback('Saving disabled: the saved park was not loaded or required models are unavailable.',true);return false;}
 const epoch=parkEpoch;
 try{await persistLocal();if(epoch!==parkEpoch||!localSaveAllowed||!presentationUsable)return false;if(!quiet)feedback('Your park has been saved in this browser.');return true;}
 catch(e){feedback('Save failed: '+e.message,true);return false;}
}
async function restoreLocal(){
 let canSave=true;
 try{
  const database=await db();let save;
  try{
   save=await new Promise((resolve,reject)=>{
    const store=database.transaction('parks').objectStore('parks');
    const read=index=>{
     // A stored undefined value is present and must be validated, not skipped.
     const r=store.openCursor(saveSlots[index]);
     r.onsuccess=()=>{
      if(r.result)resolve({present:true,value:r.result.value});
      else if(index===saveSlots.length-1)resolve({present:false});
      else read(index+1);
     };
     r.onerror=()=>reject(r.error);
    };
    read(0);
   });
  }finally{database.close();}
  if(save.present){await request('load',save.value);staticRevision=null;feedback('Your saved park has been restored.');}
 }catch(e){canSave=false;feedback('Saved park was not loaded: '+e.message,true);}
 ready=true;
 try{
  await loadLibraryCatalogue();await refresh(true);await qualifyParkPresentation();presentationUsable=true;localSaveAllowed=canSave;renderPalette();document.body.inert=false;
  if(!$('feedback').classList.contains('error'))feedback('Your park is ready. Select a tool to build or inspect.');
 }catch(error){presentationUsable=false;localSaveAllowed=false;document.body.inert=true;feedback('Required park models are unavailable: '+error.message+' Reload to try again. Your saved park was kept.',true);}
}
$('save').onclick=()=>saveLocal();
setInterval(()=>{if(ready&&presentationUsable&&!document.body.inert)saveLocal(true);},60000);
$('export').onclick=async()=>{try{const save=await request('save',null),url=URL.createObjectURL(new Blob([save],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='coaster-park.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);feedback('Park exported. Keep the file as a backup of this park.');}catch(e){feedback(e.message,true);}};
$('import').onclick=()=>$('import-file').click();
$('import-file').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 const previousSaveAllowed=localSaveAllowed,previousUsable=presentationUsable;let posted=false,committed=false,recovered=false;
 try{
  document.body.inert=true;closeConstructionDetails();invalidatePreview();down=null;
  if(file.size>64*1024*1024)throw new Error('This park file is too large.');
  staticRevision=null;
  await request('load',await file.text(),{onPosted:()=>{posted=true;presentationUsable=false;localSaveAllowed=false;}});committed=true;
  selection=null;selectedRide=0;hover=null;quoted=null;quoteSequence++;inspectSignature='';staticRevision=null;setTool('inspect');
  await loadLibraryCatalogue();await refresh(true);await qualifyParkPresentation();presentationUsable=true;localSaveAllowed=true;recovered=true;
  try{await persistLocal();}catch(error){feedback('Park imported, but browser saving failed: '+error.message+' Export the park to keep a backup.',true);return;}
  feedback('Park imported successfully.');
 }catch(error){
  feedback((committed?'Park imported, but its view is unavailable: ':'Import failed: ')+error.message,true);
  if(!posted||typeof error.cause?.code==='string'){
   presentationUsable=previousUsable;localSaveAllowed=previousSaveAllowed;staticRevision=null;await refresh(true);recovered=staticRevision!==null&&previousUsable;
  }else{presentationUsable=false;localSaveAllowed=false;}
 }finally{e.target.value='';document.body.inert=!recovered;if(recovered)schedulePreview();}
};
$('new').onclick=async()=>{
 if(!confirm('Start a new Copper Meadows park? Export this park first if you want to keep it.'))return;
 const previousSaveAllowed=localSaveAllowed,previousUsable=presentationUsable;let posted=false,committed=false,recovered=false;
 try{
  document.body.inert=true;closeConstructionDetails();invalidatePreview();down=null;staticRevision=null;
  await request('new-park',null,{onPosted:()=>{posted=true;presentationUsable=false;localSaveAllowed=false;}});committed=true;
  scene.requestOverview();selection=null;selectedRide=0;hover=null;quoted=null;quoteSequence++;staticRevision=null;inspectSignature='';setTool('inspect');
  await loadLibraryCatalogue();await refresh(true);await qualifyParkPresentation();presentationUsable=true;localSaveAllowed=true;renderPalette();recovered=true;feedback('A new park is ready.');
 }catch(error){
  feedback((committed?'The new park view is unavailable: ':'')+error.message,true);
  if(!posted||typeof error.cause?.code==='string'){
   presentationUsable=previousUsable;localSaveAllowed=previousSaveAllowed;staticRevision=null;await refresh(true);recovered=staticRevision!==null&&previousUsable;
  }else{presentationUsable=false;localSaveAllowed=false;}
 }finally{document.body.inert=!recovered;if(recovered)schedulePreview();}
};
renderPalette();
document.body.inert=true;
startWorker();

export {request,execute,scene,refresh,contentLibrary};
