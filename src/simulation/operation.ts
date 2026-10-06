import type {Element,Portal,Ride,Rules,Track} from './types.js';
import {endpoint,same} from './geometry.js';
import {ensure} from './validation.js';

export type Station={id:number,track:number[]};
export type Eligibility={circuit:boolean,stations:Station[],issues:string[]};
type Elements=Pick<ReadonlyMap<number,Element>,'get'|'values'>;
const directions=[[1,0],[0,1],[-1,0],[0,-1]] as const;

export function stationGroups(ride:Ride,elements:Elements,rules:Rules):Station[]{
  const groups:Station[]=[];
  let current:Station|undefined;
  for(const id of ride.track){
    const track=elements.get(id) as Track;
    if(!rules.pieces[track.piece]!.station){current=undefined;continue;}
    if(!current){current={id,track:[]};groups.push(current);}
    current.track.push(id);
  }
  const last=ride.track.at(-1);
  if(groups.length>1&&last!==undefined){
    const track=elements.get(last) as Track;
    if(rules.pieces[track.piece]!.station&&same(endpoint(track.origin,rules.pieces[track.piece]!),ride.anchor)){
      groups[0]!.track.push(...groups.pop()!.track);
    }
  }
  return groups;
}

export function validatePortal(portal:Portal,ride:Ride,elements:Elements,rules:Rules){
  const track=elements.get(portal.station);
  ensure(track?.kind==='track'&&track.ride===ride.id&&rules.pieces[track.piece]!.station,'GEOMETRY','Portal must reference a station track piece.');
  const [dx,dy]=directions[portal.direction]!;
  ensure(portal.height===track.origin.z&&(portal.tile.x+dx)*32===track.origin.x&&(portal.tile.y+dy)*32===track.origin.y&&portal.direction%2!==track.origin.direction%2,'GEOMETRY','Portal must face the side of its station at platform height.');
  const group=stationGroups(ride,elements,rules).find(s=>s.track.includes(portal.station));
  ensure(group,'GEOMETRY','Station does not belong to the ride.');
  for(const e of elements.values()){
    if(e.kind==='portal'&&e.id!==portal.id&&e.ride===ride.id&&e.role===portal.role){
      ensure(!group.track.includes(e.station),'GEOMETRY','Station already has this portal role.');
    }
  }
}

export function eligibility(ride:Ride,elements:Elements,rules:Rules):Eligibility{
  const stations=stationGroups(ride,elements,rules),last=ride.track.at(-1),track=last===undefined?undefined:elements.get(last) as Track;
  const circuit=ride.track.length>1&&!!track&&same(endpoint(track.origin,rules.pieces[track.piece]!),ride.anchor);
  const portals=[...elements.values()].filter((e):e is Portal=>e.kind==='portal'&&e.ride===ride.id);
  const issues:string[]=[];
  if(!stations.length)issues.push('A station is required.');
  if(!circuit)issues.push('The circuit is incomplete.');
  if(!portals.some(p=>p.role==='entrance'))issues.push('An entrance is required.');
  if(!portals.some(p=>p.role==='exit'))issues.push('An exit is required.');
  for(const station of stations){
    if(!portals.some(p=>station.track.includes(p.station)))issues.push(`Station ${station.id} has no entrance or exit.`);
  }
  return{circuit,stations,issues};
}

export function portalApproach(portal:Portal){
  const [dx,dy]=directions[portal.direction]!;
  return{x:portal.tile.x-dx,y:portal.tile.y-dy,z:portal.height};
}
