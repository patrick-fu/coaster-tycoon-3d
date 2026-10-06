import {LIMITS,type Cell,type Command,type Connector,type Element,type ErrorCode,type Path,type Portal,type Quote,type Receipt,type Result,type Ride,type Rules,type State,type Tile,type Track,type WorldOptions} from './types.js';
import {Fault,ensure,integer,record,result} from './validation.js';
import {endpoint,footprint,same,validateRules} from './geometry.js';
import {eligibility,portalApproach,validatePortal} from './operation.js';
import {compileCourse,createTrain,stepTrain,type Course,type Measurements,type Train} from './motion.js';
import {boardGuests,recoverPeople,stepPeople,unloadGuests,type Guest,type PathPoint,type PeopleIndex,type Routing} from './people.js';
import {Routes} from './routes.js';
type Index=PeopleIndex&{cells:Map<number,{id:number,cell:Cell}[]>,records:number};
type Plan={cost:number,category:'construction'|'refund'|'loan'|'none',cells:Cell[],endpoint?:Connector,id?:number,commit:()=>void};
const at=(t:Tile)=>t.y*256+t.x;
const pathKey=(x:number,y:number,z:number)=>`${x},${y},${z}`;
function validTile(v:unknown):asserts v is Tile{record(v,['x','y']);ensure(integer(v.x,0,255)&&integer(v.y,0,255),'INVALID_COMMAND','Invalid tile coordinates.');}
function validConnector(v:unknown):asserts v is Connector{record(v,['x','y','z','direction','pitch','bank']);ensure(integer(v.x,-32768,32768)&&v.x%32===0&&integer(v.y,-32768,32768)&&v.y%32===0&&integer(v.z,0,1000000)&&v.z%8===0&&integer(v.direction,0,3)&&integer(v.pitch,-1,1)&&integer(v.bank,-1,1),'GEOMETRY','Invalid connector.');}
function validPoint(v:unknown):asserts v is PathPoint{record(v,['x','y','z']);ensure(integer(v.x,0,255)&&integer(v.y,0,255)&&integer(v.z,0,1000000)&&v.z%8===0,'INVALID_COMMAND','Invalid path position.');}
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
    case 'set-park-entrance':record(c,['type','point']);if(c.point!==null)validPoint(c.point);break;
    case 'set-park-open':record(c,['type','open']);ensure(typeof c.open==='boolean','INVALID_COMMAND','Invalid park status.');break;
    case 'set-ride-price':record(c,['type','ride','price']);ensure(integer(c.ride,0,254)&&integer(c.price,0,1000000),'INVALID_COMMAND','Invalid ticket price.');break;
    case 'set-ride-broken':record(c,['type','ride','broken']);ensure(integer(c.ride,0,254)&&typeof c.broken==='boolean','INVALID_COMMAND','Invalid breakdown state.');break;
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
  private routes=new Routes();
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
    this.state={version:3,rules:JSON.stringify(this.rules),side:options.side,tick:0,revision:0,topologyRevision:0,rng:options.seed,paused:false,initialCash:options.cash,cash:options.cash,loan:0,maxLoan:options.maxLoan,spent:0,refunded:0,nextElement:1,nextEntity:1,people:{entry:null,open:false,guests:[],departedSpent:0},ledger:{rideSales:0,shopSales:0,stock:0,wages:0,upkeep:0,interest:0},trains:[],terrain,water,owned,rides:[],elements:[]};
    this.index=this.indexState(this.state);
  }
  get revision():string{return `${this.session}:${this.generation}:${this.state.revision}`;}
  snapshot():State{return structuredClone(this.state);}
  exportSave():string{return JSON.stringify(this.state);}
  restoreSave(input:unknown):Result<void>{return result(()=>{
    ensure(typeof input==='string'&&input.length<=64*1024*1024,'INVALID_SAVE','Invalid or oversized save.');let candidate:State;
    try{candidate=JSON.parse(input) as State;}catch{throw new Fault('INVALID_SAVE','Save is not valid JSON.');}
    let index:Index;try{index=this.indexState(candidate);}catch(e){if(e instanceof Fault)throw new Fault(e.code==='WRONG_RULES'?'WRONG_RULES':'INVALID_SAVE',e.message);throw e;}
    this.state=candidate;this.index=index;this.courses.clear();this.routes=new Routes();this.generation++;
  });}
  quote(input:unknown):Result<Quote>{return result(()=>{const p=this.plan(command(input));this.finances(p);return{revision:this.revision,cost:p.cost,cells:structuredClone(p.cells),...(p.endpoint?{endpoint:{...p.endpoint}}:{})};});}
  execute(input:unknown,expectedRevision:string):Result<Receipt>{return result(()=>{
    ensure(typeof expectedRevision==='string'&&expectedRevision===this.revision,'STALE_REVISION','World changed; refresh the quote.');
    const p=this.plan(command(input));this.finances(p);
    ensure(this.state.revision<Number.MAX_SAFE_INTEGER&&this.state.topologyRevision<Number.MAX_SAFE_INTEGER,'CAPACITY','Revision capacity exhausted.');
    p.commit();this.state.cash-=p.cost;
    if(p.category==='construction')this.state.spent+=p.cost;if(p.category==='refund')this.state.refunded-=p.cost;
    recoverPeople(this.state,this.rules,this.index,this.navigation(this.state,this.index));
    this.state.revision++;return{revision:this.revision,cost:p.cost,...(p.id!==undefined?{id:p.id}:{})};
  });}
  advance(ticks:number):Result<number>{return result(()=>{
    ensure(integer(ticks,0,4096),'INVALID_COMMAND','Invalid tick batch.');if(this.state.paused)return 0;
    ensure(integer(this.state.tick+ticks),'CAPACITY','Clock capacity exhausted.');
    const candidate:State={...this.state,ledger:{...this.state.ledger},rides:this.state.rides.map(r=>({...r,queue:[...r.queue]})),trains:this.state.trains.map(t=>({...t,seats:[...t.seats],stats:{...t.stats}})),people:{...this.state.people,guests:this.state.people.guests.map(g=>({...g}))}};
    const index:Index={...this.index,rides:new Map(candidate.rides.map(r=>[r.id,r])),trains:new Map(candidate.trains.map(t=>[t.ride,t])),guests:new Map(candidate.people.guests.map(g=>[g.id,g]))};
    const route=this.navigation(candidate,index);
    for(let i=0;i<ticks;i++){
      candidate.tick++;stepPeople(candidate,this.rules,index,route);
      for(const train of candidate.trains){
        const ride=index.rides.get(train.ride)!;boardGuests(train,candidate,this.rules,index,route);
        if(ride.broken)continue;
        if(train.phase==='unloading'&&train.wait+1>=this.rules.motion.unloadTicks&&!unloadGuests(train,candidate,this.rules,index,route))continue;
        stepTrain(train,this.course(ride),this.rules.motion,ride.status!=='closed'||train.seats.some(id=>id!==null));
      }
    }
    this.state=candidate;this.index=index;
    return ticks;
  });}
  circuit(ride:number):Result<boolean>{return result(()=>{const r=this.ride(ride);return r.track.length>1&&same(this.tip(r),r.anchor);});}
  route(from:{x:number,y:number,z:number},to:{x:number,y:number,z:number},queueRide:number|null=null):Result<{x:number,y:number,z:number}[]>{return result(()=>{
    for(const p of [from,to]){record(p,['x','y','z']);ensure(integer(p.x,0,255)&&integer(p.y,0,255)&&integer(p.z,0,this.rules.maxHeight),'INVALID_COMMAND','Invalid route point.');}
    if(queueRide!==null)this.ride(queueRide);
    return this.routes.find(this.index.paths,this.state.topologyRevision,from,to,queueRide);
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
  private navigation(state:State,index:Index):Routing{return{
    find:(from,to,ride)=>this.routes.find(index.paths,state.topologyRevision,from,to,ride),
    next:(from,to,ride)=>this.routes.next(index.paths,state.topologyRevision,from,to,ride),
    distance:(from,to,ride)=>this.routes.distance(index.paths,state.topologyRevision,from,to,ride),
  };}
  private course(ride:Ride){let course=this.courses.get(ride.id);if(!course){course=compileCourse(ride,this.index.elements,this.rules,this.rules.motion);this.courses.set(ride.id,course);}return course;}
  private editable(ride:Ride){const train=this.index.trains.get(ride.id);ensure(ride.status==='closed'&&(!train||train.phase==='waiting'&&!train.seats.some(id=>id!==null)),'RIDE_ACTIVE','Close the ride and wait for its empty train to return before editing.');}
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
  private finances(p:Plan){ensure(integer(this.state.cash-p.cost,-Number.MAX_SAFE_INTEGER)&&(p.cost<=0||this.state.cash>=p.cost),'INSUFFICIENT_CASH','Insufficient cash or cash capacity exceeded.');if(p.category==='construction')ensure(integer(this.state.spent+p.cost),'CAPACITY','Ledger capacity exhausted.');if(p.category==='refund')ensure(integer(this.state.refunded-p.cost),'CAPACITY','Ledger capacity exhausted.');}
  private plan(c:Command):Plan{
    const empty={cost:0,category:'none' as const,cells:[] as Cell[]};
    switch(c.type){
      case 'create-ride':{
        this.owned(c.tile);ensure(c.height<=this.rules.maxHeight,'GEOMETRY','Height exceeds supported range.');ensure(this.state.rides.length<LIMITS.rideSlots,'CAPACITY','Ride/facility slots exhausted.');
        let id=0;while(this.index.rides.has(id))id++;const r:Ride={id,name:c.name,anchor:{x:c.tile.x*32,y:c.tile.y*32,z:c.height,direction:c.direction,pitch:0,bank:0},track:[],status:'closed',cars:1,price:this.rules.guests.defaultRidePrice,income:0,broken:false,queue:[]};
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
            ensure(this.state.people.guests.length+this.state.trains.reduce((n,t)=>n+t.carIds.length,0)+r.cars<=LIMITS.sharedEntities&&integer(this.state.nextEntity+r.cars),'CAPACITY','Shared entity or identifier capacity exhausted.');
            train=createTrain(r.id,Array.from({length:r.cars},(_,i)=>this.state.nextEntity+i),compileCourse(r,this.index.elements,this.rules,this.rules.motion),this.rules.motion);
          }
        }
        return{...empty,commit:()=>{r.status=c.status;if(train){this.state.trains.push(train);this.index.trains.set(r.id,train);this.state.nextEntity+=r.cars;}}};
      }
      case 'reset-train':{
        const r=this.ride(c.ride),train=this.index.trains.get(r.id);
        ensure(r.status==='closed'&&(!train||!train.seats.some(id=>id!==null)&&(train.phase==='waiting'||train.phase==='stalled')),'RIDE_ACTIVE','Close the ride; its train must be empty and stopped before reset.');
        return{...empty,commit:()=>this.discardTrain(r.id)};
      }
      case 'set-train-cars':{
        const r=this.ride(c.ride);this.editable(r);ensure(c.cars<=this.rules.motion.maxCars,'OPERATING_REQUIREMENTS','Car count exceeds the selected vehicle family.');
        return{...empty,commit:()=>{this.discardTrain(r.id);r.cars=c.cars;}};
      }
      case 'set-park-entrance':{
        if(c.point!==null)ensure(this.index.paths.get(pathKey(c.point.x,c.point.y,c.point.z))?.queueFor===null,'GEOMETRY','The park entrance requires a public path.');
        return{...empty,commit:()=>{this.state.people.entry=c.point;if(c.point===null)this.state.people.open=false;}};
      }
      case 'set-park-open':{
        const entry=this.state.people.entry;if(c.open)ensure(entry&&this.index.paths.get(pathKey(entry.x,entry.y,entry.z))?.queueFor===null,'OPERATING_REQUIREMENTS','The park needs a reachable public entrance.');
        return{...empty,commit:()=>{this.state.people.open=c.open;}};
      }
      case 'set-ride-price':{
        const r=this.ride(c.ride);ensure(c.price<=this.rules.guests.maxRidePrice,'CAPACITY','Ticket price exceeds the supported range.');return{...empty,commit:()=>{r.price=c.price;}};
      }
      case 'set-ride-broken':{const r=this.ride(c.ride);return{...empty,commit:()=>{r.broken=c.broken;}};}
      case 'set-loan':ensure(c.amount<=this.state.maxLoan,'CAPACITY','Loan limit exceeded.');return{cost:this.state.loan-c.amount,category:'loan',cells:[],commit:()=>{this.state.loan=c.amount;}};
      case 'set-paused':return{...empty,commit:()=>{this.state.paused=c.paused;}};
    }
  }
  private indexState(s:State):Index{
    record(s,['version','rules','side','tick','revision','topologyRevision','rng','paused','initialCash','cash','loan','maxLoan','spent','refunded','nextElement','nextEntity','people','ledger','trains','terrain','water','owned','rides','elements']);
    ensure(s.version===3,'INVALID_SAVE','Unsupported save version.');ensure(s.rules===JSON.stringify(this.rules),'WRONG_RULES','Save rule profile differs from the engine.');
    ensure(integer(s.side,LIMITS.mapMin,LIMITS.mapMax)&&integer(s.rng,0,0xffffffff)&&typeof s.paused==='boolean','INVALID_SAVE','Invalid world metadata.');
    for(const n of [s.tick,s.revision,s.topologyRevision,s.initialCash,s.loan,s.maxLoan,s.spent,s.refunded])ensure(integer(n),'INVALID_SAVE','Invalid clock or money field.');
    record(s.ledger,['rideSales','shopSales','stock','wages','upkeep','interest']);for(const n of Object.values(s.ledger))ensure(integer(n),'INVALID_SAVE','Invalid operating ledger.');
    ensure(integer(s.cash,-Number.MAX_SAFE_INTEGER)&&s.topologyRevision<=s.revision&&s.loan<=s.maxLoan&&s.refunded<=s.spent&&BigInt(s.initialCash)+BigInt(s.loan)-BigInt(s.spent)+BigInt(s.refunded)+BigInt(s.ledger.rideSales)+BigInt(s.ledger.shopSales)-BigInt(s.ledger.stock)-BigInt(s.ledger.wages)-BigInt(s.ledger.upkeep)-BigInt(s.ledger.interest)===BigInt(s.cash)&&integer(s.nextElement,1),'INVALID_SAVE','Inconsistent finances or revisions.');
    for(const a of [s.terrain,s.water,s.owned])ensure(Array.isArray(a)&&a.length===65536,'INVALID_SAVE','Invalid backing map.');
    for(let i=0;i<65536;i++){const h=s.terrain[i]!,w=s.water[i]!;ensure(integer(h,0,this.rules.maxHeight)&&h%16===0&&integer(w,0,this.rules.maxHeight)&&w%16===0&&(w===0||w>=h)&&typeof s.owned[i]==='boolean','INVALID_SAVE','Invalid surface record.');if(i%256===0||Math.floor(i/256)===0||i%256>=s.side-1||Math.floor(i/256)>=s.side-1)ensure(!s.owned[i],'INVALID_SAVE','Boundary/outside land cannot be owned.');}
    ensure(Array.isArray(s.rides)&&s.rides.length<=255&&Array.isArray(s.elements)&&s.elements.length<=LIMITS.tileElements-65536,'INVALID_SAVE','Resource capacity exceeded.');
    const index:Index={elements:new Map(),rides:new Map(),trains:new Map(),guests:new Map(),accessCache:new Map(),cells:new Map(),paths:new Map(),records:65536};
    for(const r of s.rides){record(r,['id','name','anchor','track','status','cars','price','income','broken','queue']);ensure(['closed','testing','open'].includes(r.status)&&integer(r.cars,1,this.rules.motion.maxCars)&&integer(r.price,0,this.rules.guests.maxRidePrice)&&integer(r.income)&&typeof r.broken==='boolean'&&Array.isArray(r.queue)&&r.queue.length<=LIMITS.sharedEntities,'INVALID_SAVE','Invalid operating status or car count.');ensure(integer(r.id,0,254)&&!index.rides.has(r.id)&&typeof r.name==='string'&&r.name.length>0&&r.name.length<=80&&Array.isArray(r.track)&&r.track.length<=s.elements.length,'INVALID_SAVE','Invalid ride record.');validConnector(r.anchor);this.owned({x:r.anchor.x/32,y:r.anchor.y/32},s);ensure(r.anchor.pitch===0&&r.anchor.bank===0&&r.anchor.z<=this.rules.maxHeight,'INVALID_SAVE','Invalid ride anchor.');index.rides.set(r.id,r);}
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
    this.validatePeople(s,index);
    return index;
  }
  private validateTrains(s:State,index:Index){
    ensure(integer(s.nextEntity,1)&&Array.isArray(s.trains)&&s.trains.length<=s.rides.length,'INVALID_SAVE','Invalid shared entity state.');
    const ids=new Set<number>();
    for(const t of s.trains){
      record(t,['ride','carIds','seats','phase','position','travelled','speed','wait','laps','stats','measured']);
      ensure(integer(t.ride,0,254)&&!index.trains.has(t.ride)&&index.rides.has(t.ride)&&Array.isArray(t.carIds)&&t.carIds.length===index.rides.get(t.ride)!.cars&&Array.isArray(t.seats)&&t.seats.length===t.carIds.length*this.rules.motion.seatsPerCar&&t.seats.every(id=>id===null||integer(id,1)),'INVALID_SAVE','Invalid train membership or seats.');
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
      if(t.travelled===course.length){
        ensure(t.laps>0&&t.measured!==null,'INVALID_SAVE','Completed travel has no completed lap.');
        for(const key of ['ticks','distance','maxSpeed','minVerticalG','maxVerticalG','maxLateralG'] as const)ensure(t.measured[key]===t.stats[key],'INVALID_SAVE','Completed travel and measurement disagree.');
      }
      index.trains.set(t.ride,t);
    }
    ensure(ids.size<=LIMITS.sharedEntities,'INVALID_SAVE','Shared entity capacity exceeded.');
    for(const r of s.rides)ensure(r.status==='closed'||index.trains.has(r.id),'INVALID_SAVE','Operating ride has no train.');
  }
  private validatePeople(s:State,index:Index){
    record(s.people,['entry','open','guests','departedSpent']);
    ensure(typeof s.people.open==='boolean'&&integer(s.people.departedSpent)&&Array.isArray(s.people.guests)&&s.people.guests.length<=LIMITS.sharedEntities,'INVALID_SAVE','Invalid park guest state.');
    if(s.people.entry!==null){validPoint(s.people.entry);this.owned(s.people.entry,s);}
    ensure(!s.people.open||s.people.entry!==null&&index.paths.get(pathKey(s.people.entry.x,s.people.entry.y,s.people.entry.z))?.queueFor===null,'INVALID_SAVE','Open park has no public entrance.');
    const ids=new Set(s.trains.flatMap(t=>t.carIds));let payments=BigInt(s.people.departedSpent);
    for(const g of s.people.guests){
      record(g,['id','point','phase','goal','next','walkProgress','destination','entrance','exit','queueRide','seat','initialCash','cash','spent','fareLimit','forceTolerance','hunger','thirst','nausea','happiness','energy','queuedAt','lastRide','lastRideTick','ridesTaken','thought']);
      ensure(integer(g.id,1,s.nextEntity-1)&&!ids.has(g.id),'INVALID_SAVE','Duplicate or invalid guest entity.');ids.add(g.id);index.guests.set(g.id,g);
      validPoint(g.point);this.owned(g.point,s);
      ensure(['walking','queued','riding','stranded','leaving'].includes(g.phase)&&['none','not-enough-cash','too-intense','path-lost','ride-closed','queue-too-long','price-changed','payment-blocked','leaving'].includes(g.thought),'INVALID_SAVE','Invalid guest phase or thought.');
      for(const value of [g.initialCash,g.cash,g.spent,g.fareLimit,g.forceTolerance])ensure(integer(value,0,1000000),'INVALID_SAVE','Invalid guest cash or preference.');
      ensure(g.initialCash-g.spent===g.cash,'INVALID_SAVE','Guest pocket cash does not reconcile.');payments+=BigInt(g.spent);
      for(const value of [g.hunger,g.thirst,g.nausea,g.happiness,g.energy])ensure(integer(value,0,1000),'INVALID_SAVE','Invalid guest need.');
      for(const value of [g.queuedAt,g.lastRideTick,g.ridesTaken])ensure(integer(value,0,s.tick),'INVALID_SAVE','Invalid guest history.');
      for(const id of [g.destination,g.queueRide,g.lastRide])ensure(id===null||integer(id,0,254)&&index.rides.has(id),'INVALID_SAVE','Invalid guest ride reference.');
      ensure(integer(g.walkProgress,0,this.rules.guests.walkTicks-1),'INVALID_SAVE','Invalid walking progress.');
      for(const point of [g.goal,g.next])if(point!==null){validPoint(point);ensure(index.paths.has(pathKey(point.x,point.y,point.z)),'INVALID_SAVE','Navigation uses a missing path.');}
      ensure(g.next!==null||g.walkProgress===0,'INVALID_SAVE','Walking progress has no next path.');
      if(g.next!==null)ensure(g.goal!==null&&g.point.z===g.next.z&&Math.abs(g.point.x-g.next.x)+Math.abs(g.point.y-g.next.y)===1,'INVALID_SAVE','Next path is not adjacent.');
      if(g.phase==='riding'||g.phase==='stranded')ensure(g.goal===null&&g.next===null,'INVALID_SAVE','Inactive pedestrian retains a walking leg.');
      if(g.phase!=='riding'&&g.phase!=='stranded')ensure(index.paths.has(pathKey(g.point.x,g.point.y,g.point.z)),'INVALID_SAVE','Guest has no path.');
      if(g.seat!==null){record(g.seat,['ride','slot']);ensure(integer(g.seat.ride,0,254)&&integer(g.seat.slot,0,1023),'INVALID_SAVE','Invalid guest seat.');}
      ensure((g.phase==='queued')===(g.queueRide!==null)&&(g.phase==='riding')===(g.seat!==null),'INVALID_SAVE','Guest membership contradicts its phase.');
      if(g.phase==='queued')ensure(g.destination===g.queueRide,'INVALID_SAVE','Queue and intended ride disagree.');
      if(g.phase==='riding')ensure(g.destination===null,'INVALID_SAVE','Passenger also has a walking destination.');
      const intended=g.destination??g.seat?.ride??null;
      for(const [id,role] of [[g.entrance,'entrance'],[g.exit,'exit']] as const){
        if(intended===null)ensure(id===null,'INVALID_SAVE','Idle guest retains a portal.');
        else{const portal=id===null?undefined:index.elements.get(id);ensure(portal?.kind==='portal'&&portal.ride===intended&&portal.role===role,'INVALID_SAVE','Guest portal reference is invalid.');}
      }
    }
    ensure(ids.size<=LIMITS.sharedEntities&&payments===BigInt(s.ledger.rideSales)+BigInt(s.ledger.shopSales),'INVALID_SAVE','Shared entity or guest payment totals are inconsistent.');
    ensure(s.rides.reduce((sum,r)=>sum+BigInt(r.income),0n)===BigInt(s.ledger.rideSales),'INVALID_SAVE','Ride income does not reconcile.');
    const queued=new Set<number>(),seated=new Set<number>();
    for(const r of s.rides){
      ensure(!r.queue.length||r.status==='open'&&!r.broken&&index.trains.get(r.id)?.measured!==null,'INVALID_SAVE','Inactive ride has queued guests.');
      for(const id of r.queue){const guest=index.guests.get(id);ensure(integer(id,1)&&!queued.has(id)&&guest?.phase==='queued'&&guest.queueRide===r.id,'INVALID_SAVE','Invalid or duplicate queue membership.');queued.add(id);}
    }
    for(const t of s.trains)for(let slot=0;slot<t.seats.length;slot++){
      const id=t.seats[slot];if(id===null)continue;const guest=index.guests.get(id!);
      ensure(!seated.has(id!)&&!queued.has(id!)&&guest?.phase==='riding'&&guest.seat?.ride===t.ride&&guest.seat.slot===slot,'INVALID_SAVE','Invalid or duplicate seat ownership.');seated.add(id!);
    }
    for(const g of s.people.guests)ensure((g.phase==='queued')===queued.has(g.id)&&(g.phase==='riding')===seated.has(g.id),'INVALID_SAVE','Unregistered guest queue or seat.');
  }
}
