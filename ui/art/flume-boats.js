import * as THREE from 'three';

const vector=v=>new THREE.Vector3(v.x,v.z,v.y);
function pose(frame){
 for(const v of [frame.position,frame.direction,frame.up])if(!v||![v.x,v.y,v.z].every(Number.isFinite))throw new Error('Invalid Flume frame.');
 const f=vector(frame.direction),u=vector(frame.up);if(f.lengthSq()<1e-12||u.lengthSq()<1e-12)throw new Error('Empty Flume frame axis.');f.normalize();u.normalize();
 if(Math.abs(f.dot(u))>1e-6)throw new Error('Flume frame axes are not orthogonal.');
 const r=new THREE.Vector3().crossVectors(u,f).normalize();u.crossVectors(f,r).normalize();
 return new THREE.Matrix4().makeBasis(r,u,f).setPosition(vector(frame.position));
}

export function createBoats(assets){
 const group=new THREE.Group();group.name='FlumeBoats';
 const instances=new Map();let disposed=false,maxAnchorError=0;
 const discard=record=>{for(const rider of record.riders.values())rider.removeFromParent();record.riders.clear();record.wrapper.removeFromParent();};
 const clear=()=>{for(const record of instances.values())discard(record);instances.clear();};
 function update(packet){
  if(disposed)return;
  if(!Array.isArray(packet?.boats)||!Array.isArray(packet?.rides))throw new Error('Invalid Flume presentation packet.');
  if(assets.error||!assets.ready){clear();return;}
  const rides=new Map(packet.rides.map(ride=>[ride.id,ride])),active=new Set(),owners=new Set();maxAnchorError=0;
  for(const boat of packet.boats){
   const ride=rides.get(boat.ride);
   if(!Number.isSafeInteger(boat.id)||boat.id<=0||active.has(boat.id))throw new Error('Invalid or duplicate Flume boat ID.');
   if(!ride||ride.presentation?.kind!=='detailed-log-flume'||ride.presentation.profileId!=='detailed-log-flume-candidate-v1'||!ride.channelProfile||ride.capacity!==4||boat.instanceId!==ride.instanceId)throw new Error('Flume boat ride/profile/instance mismatch.');
   if(!Array.isArray(boat.seatIds)||boat.seatIds.length!==4||!Array.isArray(boat.seats)||boat.seats.length!==4)throw new Error('Flume requires four ordered seats.');
   for(let slot=0;slot<4;slot++){
    const seat=boat.seats[slot],id=boat.seatIds[slot];
    if(!seat||seat.slot!==slot||seat.guest!==id||id!==null&&(!Number.isSafeInteger(id)||id<=0||owners.has(id)))throw new Error('Invalid or duplicate Flume seat owner.');
    if(id!==null)owners.add(id);
   }
   active.add(boat.id);let record=instances.get(boat.id);
   if(record&&(record.ride!==boat.ride||record.instanceId!==boat.instanceId)){discard(record);instances.delete(boat.id);record=null;}
   if(!record){
    const wrapper=new THREE.Group(),body=assets.cloneBoat();wrapper.name=`FlumeBoat_${boat.id}`;wrapper.add(body);
    const root=body.getObjectByName('BoatRoot'),anchors=Array.from({length:4},(_,i)=>root.getObjectByName('Seat_'+String(i).padStart(2,'0')));
    const selection={kind:'ride',id:boat.ride};wrapper.userData.selection=selection;body.traverse(object=>{object.userData.selection=selection;});
    record={wrapper,anchors,riders:new Map(),ride:boat.ride,instanceId:boat.instanceId};instances.set(boat.id,record);group.add(wrapper);
   }
   pose(boat).decompose(record.wrapper.position,record.wrapper.quaternion,record.wrapper.scale);record.wrapper.updateMatrixWorld(true);
   for(let slot=0;slot<4;slot++){
    const seat=boat.seats[slot],expected=vector(seat.position),anchor=record.anchors[slot],error=anchor.getWorldPosition(new THREE.Vector3()).distanceTo(expected);
    if(!Number.isFinite(error)||error>1e-5)throw new Error('Authored Flume Hip differs from the authoritative seat frame.');maxAnchorError=Math.max(maxAnchorError,error);
    const id=boat.seatIds[slot],existing=record.riders.get(slot);
    if(existing&&existing.userData.guestId!==id){existing.removeFromParent();record.riders.delete(slot);}
    if(id!==null&&!record.riders.has(slot)){
     const rider=assets.cloneRider(),selection={kind:'guest',id};rider.name=`FlumeGuest_${id}`;rider.userData.guestId=id;rider.traverse(object=>{object.userData.selection=selection;});anchor.add(rider);record.riders.set(slot,rider);
    }
   }
  }
  for(const [id,record]of instances)if(!active.has(id)){discard(record);instances.delete(id);}
 }
 return{group,update,status:()=>({records:instances.size,realRiders:[...instances.values()].reduce((n,r)=>n+r.riders.size,0),maxAnchorError,disposed}),dispose:()=>{if(disposed)return;disposed=true;clear();}};
}
