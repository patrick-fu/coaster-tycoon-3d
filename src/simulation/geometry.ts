import type {Cell,Connector,PieceRule,Rules} from './types.js';
import {ensure,integer,record} from './validation.js';
export function validateRules(input:Rules):Rules{
  record(input,['id','evidence','pathPrice','terrainPrice','refundPerThousand','maxSupport','maxHeight','pieces']);
  ensure(typeof input.id==='string'&&input.id.length>0&&input.id.length<=80&&['project-candidate','reference-verified'].includes(input.evidence),'INVALID_COMMAND','Invalid rule identity.');
  for(const v of [input.pathPrice,input.terrainPrice,input.maxSupport,input.maxHeight])ensure(integer(v,0,1000000),'INVALID_COMMAND','Invalid rule value.');
  ensure(integer(input.refundPerThousand,0,1000)&&input.maxHeight>=16&&input.maxHeight%8===0,'INVALID_COMMAND','Invalid refund or height rule.');
  const keys=Object.keys(input.pieces);ensure(keys.length>0&&keys.length<=128,'INVALID_COMMAND','Invalid piece catalogue.');
  record(input.pieces,keys);let stations=0;
  for(const key of keys){
    ensure(/^[a-z][a-z0-9-]{0,39}$/.test(key),'INVALID_COMMAND','Invalid piece identifier.');
    const p=input.pieces[key]!;record(p,['price','station','end','entry','cells']);record(p.end,['x','y','z','turn','pitch','bank']);record(p.entry,['pitch','bank']);
    ensure(integer(p.price,0,1000000)&&typeof p.station==='boolean','INVALID_COMMAND','Invalid piece price or role.');
    if(p.station)stations++;
    for(const a of [p.entry.pitch,p.entry.bank,p.end.pitch,p.end.bank])ensure(integer(a,-1,1),'INVALID_COMMAND','Invalid connector attitude.');
    ensure(integer(p.end.turn,-3,3)&&integer(p.end.x,-1024,1024)&&p.end.x%32===0&&integer(p.end.y,-1024,1024)&&p.end.y%32===0&&integer(p.end.z,-1024,1024)&&p.end.z%8===0,'INVALID_COMMAND','Invalid endpoint.');
    ensure(p.end.x!==0||p.end.y!==0||p.end.z!==0,'INVALID_COMMAND','A piece must advance its endpoint.');
    ensure(Array.isArray(p.cells)&&p.cells.length>0&&p.cells.length<=64,'INVALID_COMMAND','Invalid clearance footprint.');
    const occupied=new Set<string>();
    for(const c of p.cells){record(c,['x','y','low','high','mask']);ensure(integer(c.x,-1024,1024)&&c.x%32===0&&integer(c.y,-1024,1024)&&c.y%32===0&&integer(c.low,-1024,1024)&&integer(c.high,-1024,2048)&&c.low%8===0&&c.high%8===0&&c.high>c.low&&integer(c.mask,1,15),'INVALID_COMMAND','Invalid clearance cell.');const k=`${c.x},${c.y}`;ensure(!occupied.has(k),'INVALID_COMMAND','Duplicate footprint cell.');occupied.add(k);}
  }
  ensure(stations>0,'INVALID_COMMAND','A station definition is required.');
  return{id:input.id,evidence:input.evidence,pathPrice:input.pathPrice,terrainPrice:input.terrainPrice,refundPerThousand:input.refundPerThousand,maxSupport:input.maxSupport,maxHeight:input.maxHeight,pieces:Object.fromEntries(keys.sort().map(k=>{const p=input.pieces[k]!;return[k,{price:p.price,station:p.station,end:{x:p.end.x,y:p.end.y,z:p.end.z,turn:p.end.turn,pitch:p.end.pitch,bank:p.end.bank},entry:{pitch:p.entry.pitch,bank:p.entry.bank},cells:p.cells.map(c=>({x:c.x,y:c.y,low:c.low,high:c.high,mask:c.mask}))}];}))};
}
export function turn(x:number,y:number,d:number){const vectors=[[1,0],[0,1],[-1,0],[0,-1]] as const;const [dx,dy]=vectors[d]!;return{x:x*dx-y*dy,y:x*dy+y*dx};}
export function endpoint(a:Connector,p:PieceRule):Connector{const b=turn(p.end.x,p.end.y,a.direction);return{x:a.x+b.x,y:a.y+b.y,z:a.z+p.end.z,direction:((a.direction+p.end.turn+4)%4) as Connector['direction'],pitch:p.end.pitch,bank:p.end.bank};}
export function footprint(a:Connector,p:PieceRule):Cell[]{return p.cells.map(c=>{const q=turn(c.x,c.y,a.direction);let mask=0;for(let i=0;i<4;i++)if(c.mask&(1<<i))mask|=1<<((i+a.direction)%4);return{x:(a.x+q.x)/32,y:(a.y+q.y)/32,low:a.z+c.low,high:a.z+c.high,mask};});}
export function same(a:Connector,b:Connector){return a.x===b.x&&a.y===b.y&&a.z===b.z&&a.direction===b.direction&&a.pitch===b.pitch&&a.bank===b.bank;}
