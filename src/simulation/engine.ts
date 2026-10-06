import {LIMITS,type Cell,type Command,type Connector,type Element,type ErrorCode,type Path,type Portal,type Quote,type Receipt,type Result,type Ride,type Rules,type State,type Tile,type Track,type WorldOptions} from './types.js';
import {Fault,ensure,integer,record,result} from './validation.js';
import {endpoint,footprint,same,validateRules} from './geometry.js';
import {eligibility,portalApproach,validatePortal} from './operation.js';
import {compileCourse,createTrain,stepTrain,type Course,type Measurements,type Train} from './motion.js';
type Index={elements:Map<number,Element>,rides:Map<number,Ride>,trains:Map<number,Train>,cells:Map<number,{id:number,cell:Cell}[]>,paths:Map<string,Path>,records:number};
type Plan={cost:number,category:'construction'|'refund'|'loan'|'none',cells:Cell[],endpoint?:Connector,id?:number,commit:()=>void};
const at=(t:Tile)=>t.y*256+t.x;
const pathKey=(x:number,y:number,z:number)=>`${x},${y},${z}`;
function validTile(v:unknown):asserts v is Tile{record(v,['x','y']);ensure(integer(v.x,0,255)&&integer(v.y,0,255),'INVALID_COMMAND','Invalid tile coordinates.');}
function validConnector(v:unknown):asserts v is Connector{record(v,['x','y','z','direction','pitch','bank']);ensure(integer(v.x,-32768,32768)&&v.x%32===0&&integer(v.y,-32768,32768)&&v.y%32===0&&integer(v.z,0,1000000)&&v.z%8===0&&integer(v.direction,0,3)&&integer(v.pitch,-1,1)&&integer(v.bank,-1,1),'GEOMETRY','Invalid connector.');}
function command(value:unknown):Command{
  ensure(value!==null&&typeof value==='object'&&Object.hasOwn(Object.getOwnPropertyDescriptor(value,'type')??{},'value'),'INVALID_COMMAND','Missing command data type.');const c=value as Command;
  switch(c.type){
    case 'create-ride':record(c,['type','name','tile','height','direction']);validTile(c.tile);ensure(typeof c.name==='string'&&c.name.length>0&&c.name.length<=80&&integer(c.direction,0,3),'INVALID_COMMAND','Invalid ride.');break;
    case 'append-track':record(c,['type','ride','piece']);ensure(integer(c.ride,0,254)&&typeof c.piece==='string','INVALID_COMMAND','Invalid track request.');break;
    case 'remove-last-track':record(c,['type','ride']);ensure(integer(c.ride,0,254),'INVALID_COMMAND','Invalid ride identifier.');break;
    case 'place-path':record(c,['type','tile','height','queueFor']);validTile(c.tile);ensure(c.queueFor===null||integer(c.queueFor,0,254),'INVALID_COMMAND','Invalid queue association.');break;
    case 'remove-path':record(c,['type','id']);ensure(integer(c.id,1),'INVALID_COMMAND','Invalid path identifier.');break;
    case 'set-terrain':record(c,['type','tile','height','water']);validTile(c.tile);ensure(integer(c.water,0,1000000)&&c.water%16===0,'INVALID_COMMAND','Invalid water level.');break;
    case 'place-portal':record(c,['type','ride','station','role','tile','height','direction']);validTile(c.tile);ensure(integer(c.ride,0,254)&&integer(c.station,1)&&(c.role==='entrance'||c.role==='exit')&&integer(c.direction,0,3),'INVALID_COMMAND','Invalid portal request.');break;
    case 'remove-portal':record(c,['type','id']);ensure(integer(c.id,1),'INVALID_COMMAND','Invalid portal identifier.');break;
    case 'set-ride-status':record(c,['type','ride','status']);ensure(integer(c.ride,0,254)&&['closed','testing','open'].includes(c.status),'INVALID_COMMAND','Invalid operating status.');break;
    case 'reset-train':record(c,['type','ride']);ensure(integer(c.ride,0,254),'INVALID_COMMAND','Invalid ride identifier.');break;
    case 'set-train-cars':record(c,['type','ride','cars']);ensure(integer(c.ride,0,254)&&integer(c.cars,1,32),'INVALID_COMMAND','Invalid train configuration.');break;
    case 'set-loan':record(c,['type','amount']);ensure(integer(c.amount),'INVALID_COMMAND','Invalid loan principal.');break;
    case 'set-paused':record(c,['type','paused']);ensure(typeof c.paused==='boolean','INVALID_COMMAND','Invalid pause flag.');break;
    default:throw new Fault('INVALID_COMMAND','Unknown command type.');
  }
  if('height' in c)ensure(integer(c.height,0,1000000)&&c.height%8===0,'GEOMETRY','Invalid height.');
  return structuredClone(c);
}

export class Engine{
  private session=Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('');
  private generation=0n;
  private courses=new Map<number,Course>();
  private state:State;
  private rules:Rules;
  private index:Index;
  constructor(options:WorldOptions,rules:Rules){
    this.rules=validateRules(rules);
    record(options,Object.hasOwn(options,'land')?['side','cash','maxLoan','seed','land']:['side','cash','maxLoan','seed']);
    ensure(integer(options.side,LIMITS.mapMin,LIMITS.mapMax)&&integer(options.cash)&&integer(options.maxLoan)&&integer(options.seed,0,0xffffffff),'INVALID_COMMAND','Invalid world options.');
    const terrain=Array<number>(65536).fill(16),water=Array<number>(65536).fill(0),owned=Array<boolean>(65536).fill(false);
    for(let y=1;y<options.side-1;y++)for(let x=1;x<options.side-1;x++)owned[at({x,y})]=true;
    if(options.land){ensure(Array.isArray(options.land)&&options.land.length<=65536,'INVALID_COMMAND','Invalid land setup.');const seen=new Set<number>();
      for(const l of options.land){record(l,['tile','height','water','owned']);validTile(l.tile);this.bounds(l.tile,options.side);ensure(!seen.has(at(l.tile))&&integer(l.height,0,this.rules.maxHeight)&&l.height%16===0&&integer(l.water,0,this.rules.maxHeight)&&l.water%16===0&&(l.water===0||l.water>=l.height)&&typeof l.owned==='boolean','INVALID_COMMAND','Invalid land setup.');seen.add(at(l.tile));terrain[at(l.tile)]=l.height;water[at(l.tile)]=l.water;owned[at(l.tile)]=l.owned;}
    }
    this.state={version:2,rules:JSON.stringify(this.rules),side:options.side,tick:0,revision:0,topologyRevision:0,rng:options.seed,paused:false,initialCash:options.cash,cash:options.cash,loan:0,maxLoan:options.maxLoan,spent:0,refunded:0,nextElement:1,nextEntity:1,trains:[],terrain,water,owned,rides:[],elements:[]};
    this.index=this.indexState(this.state);
  }
  get revision():string{return `${this.session}:${this.generation}:${this.state.revision}`;}
  snapshot():State{return structuredClone(this.state);}
  exportSave():string{return JSON.stringify(this.state);}
  restoreSave(input:unknown):Result<void>{return result(()=>{
    ensure(typeof input==='string'&&input.length<=32*1024*1024,'INVALID_SAVE','Invalid or oversized save.');let candidate:State;
    try{candidate=JSON.parse(input) as State;}catch{throw new Fault('INVALID_SAVE','Save is not valid JSON.');}
    let index:Index;try{index=this.indexState(candidate);}catch(e){if(e instanceof Fault)throw new Fault(e.code==='WRONG_RULES'?'WRONG_RULES':'INVALID_SAVE',e.message);throw e;}
    this.state=candidate;this.index=index;this.courses.clear();this.generation++;
  });}
  quote(input:unknown):Result<Quote>{return result(()=>{const p=this.plan(command(input));this.finances(p);return{revision:this.revision,cost:p.cost,cells:structuredClone(p.cells),...(p.endpoint?{endpoint:{...p.endpoint}}:{})};});}
  execute(input:unknown,expectedRevision:string):Result<Receipt>{return result(()=>{
    ensure(typeof expectedRevision==='string'&&expectedRevision===this.revision,'STALE_REVISION','World changed; refresh the quote.');
    const p=this.plan(command(input));this.finances(p);
    ensure(this.state.revision<Number.MAX_SAFE_INTEGER&&this.state.topologyRevision<Number.MAX_SAFE_INTEGER,'CAPACITY','Revision capacity exhausted.');
    p.commit();this.state.cash-=p.cost;
    if(p.category==='construction')this.state.spent+=p.cost;if(p.category==='refund')this.state.refunded-=p.cost;
    this.state.revision++;return{revision:this.revision,cost:p.cost,...(p.id!==undefined?{id:p.id}:{})};
  });}
  advance(ticks:number):Result<number>{return result(()=>{
    ensure(integer(ticks,0,4096),'INVALID_COMMAND','Invalid tick batch.');if(this.state.paused)return 0;
    ensure(integer(this.state.tick+ticks),'CAPACITY','Clock capacity exhausted.');
    for(let i=0;i<ticks;i++){
      for(const train of this.state.trains)stepTrain(train,this.course(this.ride(train.ride)),this.rules.motion,this.ride(train.ride).status!=='closed');
      this.state.tick++;
    }
    return ticks;
  });}
  circuit(ride:number):Result<boolean>{return result(()=>{const r=this.ride(ride);return r.track.length>1&&same(this.tip(r),r.anchor);});}
  route(from:{x:number,y:number,z:number},to:{x:number,y:number,z:number},queueRide:number|null=null):Result<{x:number,y:number,z:number}[]>{return result(()=>{
    for(const p of [from,to]){record(p,['x','y','z']);ensure(integer(p.x,0,255)&&integer(p.y,0,255)&&integer(p.z,0,this.rules.maxHeight),'INVALID_COMMAND','Invalid route point.');}
    if(queueRide!==null)this.ride(queueRide);
    const start=this.index.paths.get(pathKey(from.x,from.y,from.z)),goal=this.index.paths.get(pathKey(to.x,to.y,to.z));
    const allowed=(p:Path|undefined):p is Path=>!!p&&(p.queueFor===null||p.queueFor===queueRide);
    if(!allowed(start)||!allowed(goal))return[];
    const parents=new Map<number,number|null>([[start.id,null]]),q=[start];let head=0;
    while(head<q.length){const p=q[head++]!;if(p.id===goal.id){const route=[];let id:number|null=p.id;while(id!==null){const e=this.index.elements.get(id)! as Path;route.push({x:e.tile.x,y:e.tile.y,z:e.height});id=parents.get(id)!;}return route.reverse();}
      for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const next=this.index.paths.get(pathKey(p.tile.x+dx!,p.tile.y+dy!,p.height));if(allowed(next)&&!parents.has(next.id)){parents.set(next.id,p.id);q.push(next);}}
    }return[];
  });}
  operating(ride:number){return result(()=>eligibility(this.ride(ride),this.index.elements,this.rules));}
  access(ride:number,from:{x:number,y:number,z:number}):Result<{entrances:number[],exits:number[]}>{return result(()=>{
    this.ride(ride);record(from,['x','y','z']);ensure(integer(from.x,0,255)&&integer(from.y,0,255)&&integer(from.z,0,this.rules.maxHeight),'INVALID_COMMAND','Invalid access origin.');const entrances:number[]=[],exits:number[]=[];
    if(this.index.paths.get(pathKey(from.x,from.y,from.z))?.queueFor!==null)return{entrances,exits};
    for(const e of this.index.elements.values())if(e.kind==='portal'&&e.ride===ride){
      const approach=portalApproach(e),path=this.index.paths.get(pathKey(approach.x,approach.y,approach.z));
      if(!path||(e.role==='entrance'?path.queueFor!==ride:path.queueFor!==null))continue;
      const route=this.route(from,approach,e.role==='entrance'?ride:null);if(!route.ok)throw new Fault(route.error.code,route.error.message);
      if(route.value.length)(e.role==='entrance'?entrances:exits).push(e.id);
    }
    return{entrances,exits};
  });}
  private bounds(t:Tile,side=this.state.side){ensure(t.x>=1&&t.y>=1&&t.x<side-1&&t.y<side-1,'OFF_MAP','Tile is outside usable land.');}
  private owned(t:Tile,s=this.state){this.bounds(t,s.side);ensure(s.owned[at(t)],'NOT_OWNED','Land is not owned.');}
  private ride(id:number){ensure(integer(id,0,254),'UNKNOWN_RIDE','Invalid ride identifier.');const r=this.index.rides.get(id);ensure(r,'UNKNOWN_RIDE','Ride does not exist.');return r;}
  private course(ride:Ride){let course=this.courses.get(ride.id);if(!course){course=compileCourse(ride,this.index.elements,this.rules,this.rules.motion);this.courses.set(ride.id,course);}return course;}
  private editable(ride:Ride){ensure(ride.status==='closed'&&(!this.index.trains.has(ride.id)||this.index.trains.get(ride.id)!.phase==='waiting'),'RIDE_ACTIVE','Close the ride and wait for its train to return before editing.');}
  private discardTrain(ride:number){this.state.trains=this.state.trains.filter(t=>t.ride!==ride);this.index.trains.delete(ride);this.courses.delete(ride);}
  private tip(r:Ride):Connector{const id=r.track.at(-1);if(id===undefined)return{...r.anchor};const p=this.index.elements.get(id)! as Track;return endpoint(p.origin,this.rules.pieces[p.piece]!);}
  private cells(e:Element):Cell[]{return e.kind==='track'?footprint(e.origin,this.rules.pieces[e.piece]!):[{x:e.tile.x,y:e.tile.y,low:e.height,high:e.height+16,mask:15}];}
  private clear(cells:Cell[],s=this.state,index=this.index){
    for(const c of cells){this.owned(c,s);ensure(c.low>=0&&c.high<=this.rules.maxHeight,'GEOMETRY','Clearance exceeds height range.');const ground=s.terrain[at(c)]!,water=s.water[at(c)]!;
      ensure(c.low>=ground&&c.low>=water,'CLEARANCE','Construction intersects terrain or water.');ensure(c.low-ground<=this.rules.maxSupport,'SUPPORT','Support height exceeded.');
      for(const occupied of index.cells.get(at(c))??[])ensure(!(c.mask&occupied.cell.mask)||c.low>=occupied.cell.high||c.high<=occupied.cell.low,'CLEARANCE','Construction intersects an existing element.');
    }
    ensure(index.records+cells.length<=LIMITS.tileElements,'CAPACITY','Tile element capacity exhausted.');
  }
  private add(e:Element,cells:Cell[]){this.state.elements.push(e);this.index.elements.set(e.id,e);for(const c of cells){const a=this.index.cells.get(at(c))??[];a.push({id:e.id,cell:c});this.index.cells.set(at(c),a);}this.index.records+=cells.length;if(e.kind==='path')this.index.paths.set(pathKey(e.tile.x,e.tile.y,e.height),e);this.state.nextElement++;}
  private remove(e:Element){for(const c of this.cells(e)){const remaining=this.index.cells.get(at(c))!.filter(v=>v.id!==e.id);if(remaining.length)this.index.cells.set(at(c),remaining);else this.index.cells.delete(at(c));this.index.records--;}
    this.state.elements=this.state.elements.filter(v=>v.id!==e.id);this.index.elements.delete(e.id);if(e.kind==='path')this.index.paths.delete(pathKey(e.tile.x,e.tile.y,e.height));
  }
  private finances(p:Plan){ensure(integer(this.state.cash-p.cost),'INSUFFICIENT_CASH','Insufficient cash or cash capacity exceeded.');if(p.category==='construction')ensure(integer(this.state.spent+p.cost),'CAPACITY','Ledger capacity exhausted.');if(p.category==='refund')ensure(integer(this.state.refunded-p.cost),'CAPACITY','Ledger capacity exhausted.');}
  private plan(c:Command):Plan{
    const empty={cost:0,category:'none' as const,cells:[] as Cell[]};
    switch(c.type){
      case 'create-ride':{
        this.owned(c.tile);ensure(c.height<=this.rules.maxHeight,'GEOMETRY','Height exceeds supported range.');ensure(this.state.rides.length<LIMITS.rideSlots,'CAPACITY','Ride/facility slots exhausted.');
        let id=0;while(this.index.rides.has(id))id++;const r:Ride={id,name:c.name,anchor:{x:c.tile.x*32,y:c.tile.y*32,z:c.height,direction:c.direction,pitch:0,bank:0},track:[],status:'closed',cars:1};
        return{...empty,id,commit:()=>{this.state.rides.push(r);this.index.rides.set(id,r);}};
      }
      case 'append-track':{
        const r=this.ride(c.ride);this.editable(r);ensure(Object.hasOwn(this.rules.pieces,c.piece),'GEOMETRY','Unknown track piece.');const p=this.rules.pieces[c.piece]!,origin=this.tip(r);
        ensure(!(r.track.length>1&&same(origin,r.anchor)),'CIRCUIT_CLOSED','Remove a section before extending a closed circuit.');
        ensure(r.track.length>0||p.station,'GEOMETRY','A ride starts with a station.');ensure(origin.pitch===p.entry.pitch&&origin.bank===p.entry.bank,'GEOMETRY','Connector pitch or bank does not match.');
        ensure(this.state.nextElement<Number.MAX_SAFE_INTEGER,'CAPACITY','Element identifier capacity exhausted.');const end=endpoint(origin,p);validConnector(end);const cells=footprint(origin,p);this.clear(cells);
        const e:Track={id:this.state.nextElement,kind:'track',ride:r.id,piece:c.piece,origin};
        const candidate={...r,track:[...r.track,e.id]},overlay={get:(id:number)=>id===e.id?e:this.index.elements.get(id),values:()=>this.index.elements.values()};
        for(const portal of this.state.elements)if(portal.kind==='portal'&&portal.ride===r.id)validatePortal(portal,candidate,overlay,this.rules);
        return{cost:p.price,category:'construction',cells,endpoint:end,id:e.id,commit:()=>{this.discardTrain(r.id);this.add(e,cells);r.track.push(e.id);}};
      }
      case 'remove-last-track':{
        const r=this.ride(c.ride),id=r.track.at(-1);this.editable(r);ensure(id!==undefined,'UNKNOWN_ELEMENT','Ride has no track.');ensure(!this.state.elements.some(e=>e.kind==='portal'&&e.station===id),'OPERATING_REQUIREMENTS','Remove station portals before removing their track.');const e=this.index.elements.get(id)! as Track;const cost=-Math.floor(this.rules.pieces[e.piece]!.price*this.rules.refundPerThousand/1000);
        return{cost,category:'refund',cells:[],commit:()=>{this.discardTrain(r.id);this.remove(e);r.track.pop();}};
      }
      case 'place-path':{
        if(c.queueFor!==null)this.ride(c.queueFor);ensure(this.state.nextElement<Number.MAX_SAFE_INTEGER,'CAPACITY','Element identifier capacity exhausted.');const e:Path={id:this.state.nextElement,kind:'path',tile:c.tile,height:c.height,queueFor:c.queueFor};const cells=this.cells(e);this.clear(cells);
        return{cost:this.rules.pathPrice,category:'construction',cells,id:e.id,commit:()=>{this.add(e,cells);this.state.topologyRevision++;}};
      }
      case 'remove-path':{
        const e=this.index.elements.get(c.id);ensure(e?.kind==='path','UNKNOWN_ELEMENT','Path does not exist.');return{cost:-Math.floor(this.rules.pathPrice*this.rules.refundPerThousand/1000),category:'refund',cells:[],commit:()=>{this.remove(e);this.state.topologyRevision++;}};
      }
      case 'set-terrain':{
        this.owned(c.tile);ensure(c.height%16===0&&c.height<=this.rules.maxHeight&&c.water<=this.rules.maxHeight&&(c.water===0||c.water>=c.height),'GEOMETRY','Invalid terrain or water height.');const i=at(c.tile);
        for(const occupied of this.index.cells.get(i)??[]){ensure(occupied.cell.low>=Math.max(c.height,c.water),'CLEARANCE','Terrain change intersects construction.');ensure(occupied.cell.low-c.height<=this.rules.maxSupport,'SUPPORT','Terrain change leaves unsupported construction.');}
        const cost=(Math.abs(this.state.terrain[i]!-c.height)+Math.abs(this.state.water[i]!-c.water))/16*this.rules.terrainPrice;
        return{cost,category:'construction',cells:[],commit:()=>{this.state.terrain[i]=c.height;this.state.water[i]=c.water;this.state.topologyRevision++;}};
      }
      case 'place-portal':{
        const r=this.ride(c.ride);this.editable(r);
        ensure(this.state.nextElement<Number.MAX_SAFE_INTEGER,'CAPACITY','Element identifier capacity exhausted.');
        const e:Portal={id:this.state.nextElement,kind:'portal',ride:r.id,station:c.station,role:c.role,tile:c.tile,height:c.height,direction:c.direction};
        validatePortal(e,r,this.index.elements,this.rules);const cells=this.cells(e);this.clear(cells);
        return{cost:this.rules.portalPrice,category:'construction',cells,id:e.id,commit:()=>{this.add(e,cells);this.state.topologyRevision++;}};
      }
      case 'remove-portal':{
        const e=this.index.elements.get(c.id);ensure(e?.kind==='portal','UNKNOWN_ELEMENT','Portal does not exist.');
        this.editable(this.ride(e.ride));
        return{cost:-Math.floor(this.rules.portalPrice*this.rules.refundPerThousand/1000),category:'refund',cells:[],commit:()=>{this.remove(e);this.state.topologyRevision++;}};
      }
      case 'set-ride-status':{
        const r=this.ride(c.ride);
        let train:Train|undefined;
        if(c.status!=='closed'){
          const gates=eligibility(r,this.index.elements,this.rules);ensure(gates.issues.length===0,'OPERATING_REQUIREMENTS',gates.issues.join(' '));
          if(!this.index.trains.has(r.id)){
            ensure(this.state.trains.reduce((n,t)=>n+t.carIds.length,0)+r.cars<=LIMITS.sharedEntities&&integer(this.state.nextEntity+r.cars),'CAPACITY','Shared entity or identifier capacity exhausted.');
            train=createTrain(r.id,Array.from({length:r.cars},(_,i)=>this.state.nextEntity+i),compileCourse(r,this.index.elements,this.rules,this.rules.motion),this.rules.motion);
          }
        }
        return{...empty,commit:()=>{r.status=c.status;if(train){this.state.trains.push(train);this.index.trains.set(r.id,train);this.state.nextEntity+=r.cars;}}};
      }
      case 'reset-train':{
        const r=this.ride(c.ride),train=this.index.trains.get(r.id);
        ensure(r.status==='closed'&&(!train||train.phase==='waiting'||train.phase==='stalled'),'RIDE_ACTIVE','Close the ride; a travelling train must return before reset.');
        return{...empty,commit:()=>this.discardTrain(r.id)};
      }
      case 'set-train-cars':{
        const r=this.ride(c.ride);this.editable(r);ensure(c.cars<=this.rules.motion.maxCars,'OPERATING_REQUIREMENTS','Car count exceeds the selected vehicle family.');
        return{...empty,commit:()=>{this.discardTrain(r.id);r.cars=c.cars;}};
      }
      case 'set-loan':ensure(c.amount<=this.state.maxLoan,'CAPACITY','Loan limit exceeded.');return{cost:this.state.loan-c.amount,category:'loan',cells:[],commit:()=>{this.state.loan=c.amount;}};
      case 'set-paused':return{...empty,commit:()=>{this.state.paused=c.paused;}};
    }
  }
  private indexState(s:State):Index{
    record(s,['version','rules','side','tick','revision','topologyRevision','rng','paused','initialCash','cash','loan','maxLoan','spent','refunded','nextElement','nextEntity','trains','terrain','water','owned','rides','elements']);
    ensure(s.version===2,'INVALID_SAVE','Unsupported save version.');ensure(s.rules===JSON.stringify(this.rules),'WRONG_RULES','Save rule profile differs from the engine.');
    ensure(integer(s.side,LIMITS.mapMin,LIMITS.mapMax)&&integer(s.rng,0,0xffffffff)&&typeof s.paused==='boolean','INVALID_SAVE','Invalid world metadata.');
    for(const n of [s.tick,s.revision,s.topologyRevision,s.initialCash,s.cash,s.loan,s.maxLoan,s.spent,s.refunded])ensure(integer(n),'INVALID_SAVE','Invalid clock or money field.');
    ensure(s.topologyRevision<=s.revision&&s.loan<=s.maxLoan&&s.refunded<=s.spent&&BigInt(s.initialCash)+BigInt(s.loan)-BigInt(s.spent)+BigInt(s.refunded)===BigInt(s.cash)&&integer(s.nextElement,1),'INVALID_SAVE','Inconsistent finances or revisions.');
    for(const a of [s.terrain,s.water,s.owned])ensure(Array.isArray(a)&&a.length===65536,'INVALID_SAVE','Invalid backing map.');
    for(let i=0;i<65536;i++){const h=s.terrain[i]!,w=s.water[i]!;ensure(integer(h,0,this.rules.maxHeight)&&h%16===0&&integer(w,0,this.rules.maxHeight)&&w%16===0&&(w===0||w>=h)&&typeof s.owned[i]==='boolean','INVALID_SAVE','Invalid surface record.');if(i%256===0||Math.floor(i/256)===0||i%256>=s.side-1||Math.floor(i/256)>=s.side-1)ensure(!s.owned[i],'INVALID_SAVE','Boundary/outside land cannot be owned.');}
    ensure(Array.isArray(s.rides)&&s.rides.length<=255&&Array.isArray(s.elements)&&s.elements.length<=LIMITS.tileElements-65536,'INVALID_SAVE','Resource capacity exceeded.');
    const index:Index={elements:new Map(),rides:new Map(),trains:new Map(),cells:new Map(),paths:new Map(),records:65536};
    for(const r of s.rides){record(r,['id','name','anchor','track','status','cars']);ensure(['closed','testing','open'].includes(r.status)&&integer(r.cars,1,this.rules.motion.maxCars),'INVALID_SAVE','Invalid operating status or car count.');ensure(integer(r.id,0,254)&&!index.rides.has(r.id)&&typeof r.name==='string'&&r.name.length>0&&r.name.length<=80&&Array.isArray(r.track)&&r.track.length<=s.elements.length,'INVALID_SAVE','Invalid ride record.');validConnector(r.anchor);this.owned({x:r.anchor.x/32,y:r.anchor.y/32},s);ensure(r.anchor.pitch===0&&r.anchor.bank===0&&r.anchor.z<=this.rules.maxHeight,'INVALID_SAVE','Invalid ride anchor.');index.rides.set(r.id,r);}
    let activeCost=0n;
    for(const e of s.elements){ensure(e!==null&&typeof e==='object','INVALID_SAVE','Invalid element record.');ensure(integer(e.id,1,s.nextElement-1)&&!index.elements.has(e.id),'INVALID_SAVE','Duplicate or invalid element identifier.');
      if(e.kind==='track'){record(e,['id','kind','ride','piece','origin']);ensure(typeof e.piece==='string'&&Object.hasOwn(this.rules.pieces,e.piece)&&integer(e.ride,0,254)&&index.rides.has(e.ride),'INVALID_SAVE','Unknown track metadata.');validConnector(e.origin);activeCost+=BigInt(this.rules.pieces[e.piece]!.price);}
      else if(e.kind==='portal'){record(e,['id','kind','ride','station','role','tile','height','direction']);validTile(e.tile);ensure(integer(e.ride,0,254)&&index.rides.has(e.ride)&&integer(e.station,1)&&(e.role==='entrance'||e.role==='exit')&&integer(e.direction,0,3)&&integer(e.height,0,this.rules.maxHeight)&&e.height%8===0,'INVALID_SAVE','Invalid portal metadata.');activeCost+=BigInt(this.rules.portalPrice);}
      else{record(e,['id','kind','tile','height','queueFor']);ensure(e.kind==='path'&&integer(e.height,0,this.rules.maxHeight)&&e.height%8===0&&(e.queueFor===null||integer(e.queueFor,0,254)&&index.rides.has(e.queueFor)),'INVALID_SAVE','Invalid path metadata.');validTile(e.tile);activeCost+=BigInt(this.rules.pathPrice);}
      const cells=this.cells(e);this.clear(cells,s,index);for(const c of cells){const a=index.cells.get(at(c))??[];a.push({id:e.id,cell:c});index.cells.set(at(c),a);}index.records+=cells.length;index.elements.set(e.id,e);if(e.kind==='path')index.paths.set(pathKey(e.tile.x,e.tile.y,e.height),e);
    }
    ensure(BigInt(s.spent)-BigInt(s.refunded)>=activeCost,'INVALID_SAVE','Active construction exceeds its net expenditure.');
    const referenced=new Set<number>();
    for(const r of s.rides){let tip=r.anchor;for(let i=0;i<r.track.length;i++){const id=r.track[i]!;ensure(integer(id,1)&&!referenced.has(id),'INVALID_SAVE','Invalid track membership.');const e=index.elements.get(id);ensure(e?.kind==='track'&&e.ride===r.id&&same(e.origin,tip),'INVALID_SAVE','Track order or connector is invalid.');const p=this.rules.pieces[e.piece]!;ensure((i>0||p.station)&&e.origin.pitch===p.entry.pitch&&e.origin.bank===p.entry.bank,'INVALID_SAVE','Track attitude is invalid.');referenced.add(id);tip=endpoint(e.origin,p);validConnector(tip);if(i<r.track.length-1)ensure(!same(tip,r.anchor),'INVALID_SAVE','Track extends a closed circuit.');}}
    ensure(referenced.size===s.elements.filter(e=>e.kind==='track').length,'INVALID_SAVE','Unreferenced track element.');
    for(const e of s.elements)if(e.kind==='portal')validatePortal(e,index.rides.get(e.ride)!,index.elements,this.rules);
    for(const r of s.rides)if(r.status!=='closed')ensure(eligibility(r,index.elements,this.rules).issues.length===0,'INVALID_SAVE','Operating ride has invalid prerequisites.');
    this.validateTrains(s,index);
    return index;
  }
  private validateTrains(s:State,index:Index){
    ensure(integer(s.nextEntity,1)&&Array.isArray(s.trains)&&s.trains.length<=s.rides.length,'INVALID_SAVE','Invalid shared entity state.');
    const ids=new Set<number>();
    for(const t of s.trains){
      record(t,['ride','carIds','phase','position','travelled','speed','wait','laps','stats','measured']);
      ensure(integer(t.ride,0,254)&&!index.trains.has(t.ride)&&index.rides.has(t.ride)&&Array.isArray(t.carIds)&&t.carIds.length===index.rides.get(t.ride)!.cars,'INVALID_SAVE','Invalid train membership.');
      for(const id of t.carIds){ensure(integer(id,1,s.nextEntity-1)&&!ids.has(id),'INVALID_SAVE','Invalid shared car identifier.');ids.add(id);}
      ensure(eligibility(index.rides.get(t.ride)!,index.elements,this.rules).circuit,'INVALID_SAVE','A train requires a complete circuit.');
      const course=compileCourse(index.rides.get(t.ride)!,index.elements,this.rules,this.rules.motion);
      createTrain(t.ride,t.carIds,course,this.rules.motion);
      ensure(['waiting','running','unloading','stalled'].includes(t.phase)&&integer(t.position,0,course.length-1)&&integer(t.travelled,0,course.length)&&integer(t.speed,0,1000000000)&&integer(t.wait,0,Math.max(this.rules.motion.waitTicks,this.rules.motion.unloadTicks))&&integer(t.laps,0,s.tick),'INVALID_SAVE','Invalid train motion state.');
      const start=((Math.floor(course.stationEnd-this.rules.motion.carLength/2)%course.length)+course.length)%course.length;
      ensure(t.position===(start+t.travelled)%course.length&&(t.phase==='running'?t.speed>0&&t.travelled<course.length:t.speed===0)&&(t.phase!=='unloading'||t.travelled===course.length),'INVALID_SAVE','Inconsistent train position or phase.');
      ensure((t.phase!=='waiting'||t.travelled===0||t.travelled===course.length)&&(t.phase!=='stalled'||t.travelled<course.length),'INVALID_SAVE','Stopped train is outside its operating phase.');
      const measured=(m:Measurements,complete:boolean)=>{
        record(m,['ticks','distance','maxSpeed','minVerticalG','maxVerticalG','maxLateralG']);
        ensure(integer(m.ticks,0,s.tick)&&integer(m.distance,0,course.length)&&integer(m.maxSpeed,0,1000000000)&&integer(m.minVerticalG,-Number.MAX_SAFE_INTEGER)&&integer(m.maxVerticalG,m.minVerticalG)&&integer(m.maxLateralG)&&(!complete||m.distance===course.length&&m.ticks>0),'INVALID_SAVE','Invalid motion measurements.');
      };
      measured(t.stats,false);ensure(t.stats.distance===t.travelled&&t.stats.maxSpeed>=t.speed,'INVALID_SAVE','Inconsistent travel measurements.');
      ensure((t.laps===0)===(t.measured===null),'INVALID_SAVE','Completed lap measurement is missing.');if(t.measured!==null)measured(t.measured,true);
      index.trains.set(t.ride,t);
    }
    ensure(ids.size<=LIMITS.sharedEntities,'INVALID_SAVE','Shared entity capacity exceeded.');
    for(const r of s.rides)ensure(r.status==='closed'||index.trains.has(r.id),'INVALID_SAVE','Operating ride has no train.');
  }
}
