import type {Cell,Connector,Element,Portal,Track} from './types.js';
import {endpoint,same,turn} from './geometry.js';
import {ensure,integer} from './validation.js';
import {flumeCandidate,flumePieces} from '../content/log-flume.js';

type PortalRide={id:number,anchor:Connector,track:number[]};
type Elements=Pick<ReadonlyMap<number,Element>,'get'|'values'>;

function stationBays(ride:PortalRide,elements:Elements,role:Portal['role']){
 const first=elements.get(ride.track[0]!);
 if(first?.kind!=='track'||first.ride!==ride.id||first.piece!=='station'||!same(first.origin,ride.anchor)||first.origin.pitch!==0||first.origin.bank!==0||first.origin.x%32!==0||first.origin.y%32!==0)return null;
 const selected=role==='entrance'?first:elements.get(ride.track[1]!);
 if(selected?.kind!=='track'||selected.ride!==ride.id||selected.piece!=='station'||role==='exit'&&!same(selected.origin,endpoint(first.origin,flumePieces.station)))return null;
 return{first,selected};
}

export function flumePortalSocket(ride:PortalRide,elements:Elements,role:Portal['role'],side?:Portal['direction']){
 ensure(role==='entrance'||role==='exit','GEOMETRY','Unknown channel portal role.');
 const bays=stationBays(ride,elements,role);ensure(bays,'GEOMETRY','Entrance requires the first station; exit requires its actual connected second station.');
 const station=bays.selected;ensure(integer(station.origin.x)&&integer(station.origin.y),'GEOMETRY','Channel station socket must align to the native tile grid.');
 const peer=[...elements.values()].find((e):e is Portal=>e.kind==='portal'&&e.ride===ride.id&&e.role!==role),curve=ride.track.map(id=>elements.get(id)).find(e=>e?.kind==='track'&&(e.piece==='left'||e.piece==='right'));
 const direction=side??peer?.direction??((station.origin.direction+(curve?.kind==='track'&&curve.piece==='left'?3:1))%4) as Portal['direction'];
 ensure(direction===(station.origin.direction+1)%4||direction===(station.origin.direction+3)%4,'GEOMETRY','The channel portal must face a physical station side.');
 ensure(!peer||peer.direction===direction,'GEOMETRY','Channel entrance and exit must use the same station side.');const facing=turn(1,0,direction);
 return{station:station.id,tile:{x:station.origin.x/32-facing.x,y:station.origin.y/32-facing.y},height:station.origin.z,direction};
}

export function validateFlumePortal(portal:Portal,ride:PortalRide,elements:Elements){
 const socket=flumePortalSocket(ride,elements,portal.role,portal.direction);
 ensure(portal.ride===ride.id&&portal.station===socket.station&&portal.tile.x===socket.tile.x&&portal.tile.y===socket.tile.y&&portal.height===socket.height&&portal.direction===socket.direction,'GEOMETRY','Channel portal differs from its authored station bay.');
 ensure(![...elements.values()].some(e=>e.kind==='portal'&&e.id!==portal.id&&e.ride===ride.id&&e.role===portal.role),'GEOMETRY','The channel already has this portal role.');
}

export function flumePortalCells(portal:Portal):Cell[]{
 return[{...portal.tile,low:portal.height,high:portal.height+flumeCandidate.portalHeight,mask:15}];
}

export function flumePortalInterface(a:Element,b:Element,ride:PortalRide,elements:ReadonlyMap<number,Element>,cellA:Cell,cellB:Cell):boolean{
 const portal=a.kind==='portal'?a:b.kind==='portal'?b:null,station=(portal===a?b:a);
 if(!portal||station.kind!=='track'||portal.ride!==ride.id||station.ride!==ride.id||elements.get(station.id)!==station)return false;
 if(portal.role!=='entrance'&&portal.role!=='exit')return false;
 const bays=stationBays(ride,elements,portal.role);if(!bays)return false;
 const selected=bays.selected,own=station===selected,previous=portal.role==='exit'&&station===bays.first;if(!own&&!previous)return false;
 const direction=portal.direction;if(direction!==(selected.origin.direction+1)%4&&direction!==(selected.origin.direction+3)%4)return false;
 if([...elements.values()].some(e=>e.kind==='portal'&&e.ride===ride.id&&e.id!==portal.id&&(e.role===portal.role||e.direction!==direction)))return false;
 const facing=turn(1,0,direction),forward=turn(1,0,selected.origin.direction);
 if(portal.station!==selected.id||portal.height!==selected.origin.z||portal.tile.x!==selected.origin.x/32-facing.x||portal.tile.y!==selected.origin.y/32-facing.y)return false;
 const portalCell=portal===a?cellA:cellB,stationCell=portal===a?cellB:cellA;
 if(portalCell.x!==portal.tile.x||portalCell.y!==portal.tile.y||portalCell.low!==portal.height||portalCell.high!==portal.height+flumeCandidate.portalHeight||portalCell.mask!==15||stationCell.x!==portal.tile.x||stationCell.y!==portal.tile.y||stationCell.low>=portalCell.high||stationCell.high<=portalCell.low)return false;
 const shared=portalCell.mask&stationCell.mask;if(shared===0)return false;
 const s={x:selected.origin.x+16,y:selected.origin.y+16},p={x:portal.tile.x*32+16,y:portal.tile.y*32+16};
 for(let bit=0;bit<4;bit++){
  const [x,y]=[[8,8],[24,8],[24,24],[8,24]][bit]!,q={x:portal.tile.x*32+x!,y:portal.tile.y*32+y!};
  if((q.x-s.x)*forward.x+(q.y-s.y)*forward.y===(own?8:-8)&&(q.x-p.x)*facing.x+(q.y-p.y)*facing.y===8)return shared===(1<<bit);
 }
 return false;
}
