export function buildFlumeApproach(ctx,parent,path,portal,elements,ride){
 if(elements.get(path.id)!==path||elements.get(portal.id)!==portal||path.kind!=='path'||portal.kind!=='portal'||ride?.id!==portal.ride||ride.presentation.kind!=='detailed-log-flume')return null;
 const station=elements.get(portal.station),directions=[[1,0],[0,1],[-1,0],[0,-1]],facing=directions[portal.direction];
 if(station?.kind!=='track'||station.piece!=='station'||station.ride!==portal.ride||station.origin.pitch!==0||station.origin.bank!==0||!facing)return null;
 const side=(portal.direction-station.origin.direction+4)%4,[dx,dy]=facing;
 if(side!==1&&side!==3||portal.height!==station.origin.z||path.height!==portal.height||portal.tile.x!==station.origin.x/32-dx||portal.tile.y!==station.origin.y/32-dy||path.tile.x!==portal.tile.x-dx||path.tile.y!==portal.tile.y-dy)return null;
 if(portal.role==='entrance'?path.queueFor!==portal.ride:portal.role!=='exit'||path.queueFor!==null)return null;
 // The ordinary path slab stops 70mm before the accepted Portal landing.
 const material=ctx.material(path.queueFor===null?'mat-path-public-deck':'mat-path-queue-deck');
 const strip=ctx.box(parent,material,path.tile.x*4+2+dx*1.965,path.height/8+.11,path.tile.y*4+2+dy*1.965,dx ? .07 : .8,.06,dy ? .07 : .8);
 strip.name='FlumeApproach_'+portal.id;
 return strip;
}
