export const tiers = {
  ordinary:{side:128,grid:20,guests:2000,staff:50,coasters:20,shops:20,cars:360},
  large:{side:256,grid:40,guests:5000,staff:200,coasters:100,shops:100,cars:1800},
};
export type Tier=keyof typeof tiers;
type Guest={node:number,next:number,progress:number,target:number,state:number,remaining:number,cash:number,hunger:number};
type Ride={node:number,open:boolean,queue:number[],riders:number[],phase:number,broken:boolean};
type Staff={node:number,next:number,progress:number,job:number,service:number};
export class Simulation {
  spec; tick=0; rng=123456789; cash=10000000; revenue=0; expenses=0;
  guests:Guest[]=[]; rides:Ride[]=[]; staff:Staff[]=[];
  cars:Float32Array;
  surface:Uint8Array; tileRecords:Uint32Array; edges:number[][]=[]; distances=new Map<number,Int16Array>();
  edgeRemoved=false; initialPocket=0; initialCash=this.cash;
  counters={searches:0,searchNodes:0,arrivals:0,boarded:0,completed:0,purchases:0,reroutes:0,edits:0,queueReleased:0,staffCompleted:0};
  events:{tick:number,kind:string,queueReleased:number}[]=[];
  constructor(public tier:Tier,public routing:'cached'|'uncached'='cached') {
    this.spec=tiers[tier];const s=this.spec;
    this.surface=new Uint8Array(256*256);this.cars=new Float32Array(s.cars*3);
    this.tileRecords=new Uint32Array((65536+s.grid*s.grid+s.coasters*160+s.shops*2)*8);
    for(let i=0;i<this.tileRecords.length;i++)this.tileRecords[i]=i;
    for(let n=0;n<s.grid*s.grid;n++) {
      const x=n%s.grid,z=Math.floor(n/s.grid),a=[];
      if(x)a.push(n-1);if(x<s.grid-1)a.push(n+1);if(z)a.push(n-s.grid);if(z<s.grid-1)a.push(n+s.grid);
      this.edges.push(a);
    }
    for(let i=0;i<s.coasters;i++)this.rides.push({node:((i*137+11)%(s.grid*s.grid)),open:true,queue:[],riders:[],phase:0,broken:false});
    for(let i=0;i<s.guests;i++) {
      const node=i%2===0?Math.floor(this.random()*s.grid*s.grid):Math.floor(this.random()*s.grid*2);
      const cash=200+Math.floor(this.random()*300);this.initialPocket+=cash;
      this.guests.push({node,next:node,progress:0,target:Math.floor(this.random()*s.coasters),state:0,remaining:0,cash,hunger:this.random()});
    }
    for(let i=0;i<s.staff;i++)this.staff.push({node:i%(s.grid*s.grid),next:i%(s.grid*s.grid),progress:0,job:-1,service:0});
  }
  random(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;}
  coordinates(node:number){const g=this.spec.grid;return{x:2+(node%g)*(this.spec.side-4)/(g-1),z:2+Math.floor(node/g)*(this.spec.side-4)/(g-1)};}
  destination(target:number){return target<this.spec.coasters?this.rides[target].node:(target*83+17)%(this.spec.grid*this.spec.grid);}
  field(goal:number) {
    const existing=this.distances.get(goal);if(this.routing==='cached'&&existing)return existing;
    const d=new Int16Array(this.edges.length);d.fill(-1);d[goal]=0;
    const q=new Int32Array(d.length);q[0]=goal;let head=0,tail=1;
    while(head<tail){const n=q[head++];for(const v of this.edges[n])if(d[v]<0){d[v]=d[n]+1;q[tail++]=v;}}
    this.counters.searches++;this.counters.searchNodes+=tail;
    if(this.routing==='cached')this.distances.set(goal,d);return d;
  }
  nextNode(node:number,goal:number) {
    const d=this.field(goal);let best=node,bestD=d[node];
    for(const n of this.edges[node])if(d[n]>=0&&(bestD<0||d[n]<bestD)){best=n;bestD=d[n];}
    return best;
  }
  choose(g:Guest){g.target=g.hunger>.7?this.spec.coasters+Math.floor(this.random()*this.spec.shops):Math.floor(this.random()*this.spec.coasters);g.state=0;g.next=g.node;g.progress=0;}
  mutate(remove:boolean) {
    const a=Math.floor(this.edges.length/2),b=a+1;
    if(remove){this.edges[a]=this.edges[a].filter(n=>n!==b);this.edges[b]=this.edges[b].filter(n=>n!==a);this.cash-=120;this.expenses+=120;}
    else{this.edges[a].push(b);this.edges[b].push(a);this.cash+=120;this.expenses-=120;}
    this.edgeRemoved=remove;this.distances.clear();this.rides[0].open=!remove;
    const released=this.rides[0].queue.length;
    for(const id of this.rides[0].queue)this.choose(this.guests[id]);this.rides[0].queue=[];
    for(const g of this.guests)if(g.state===0){g.next=g.node;g.progress=0;this.counters.reroutes++;}
    for(const s of this.staff){s.next=s.node;s.progress=0;}
    this.counters.edits++;this.counters.queueReleased+=released;
    this.events.push({tick:this.tick,kind:remove?'remove-path-and-close-queue':'restore-path-and-queue',queueReleased:released});
  }
  step() {
    this.tick++;
    if(this.tick===400||this.tick===1200)this.mutate(true);if(this.tick===600||this.tick===1400)this.mutate(false);
    for(let i=0;i<this.guests.length;i++) {
      const g=this.guests[i];g.hunger=Math.min(1,g.hunger+.00003);
      if(g.state===2){if(--g.remaining===0){g.state=0;this.counters.completed++;this.choose(g);}continue;}
      if(g.state===1)continue;
      const goal=this.destination(g.target);
      if(g.node===goal){
        this.counters.arrivals++;
        if(g.target<this.spec.coasters){const r=this.rides[g.target];if(r.open&&!r.broken&&r.queue.length<80&&g.cash>=20){r.queue.push(i);g.state=1;}else this.choose(g);}
        else{if(g.cash>=10){g.cash-=10;this.cash+=10;this.revenue+=10;this.counters.purchases++;g.hunger=.1;}this.choose(g);}
        continue;
      }
      if(g.next===g.node)g.next=this.nextNode(g.node,goal);
      g.progress+=.18;
      if(g.progress>=1){g.node=g.next;g.progress=0;g.next=g.node;}
    }
    for(let id=0;id<this.rides.length;id++) {
      const r=this.rides[id];r.phase=(r.phase+.006)%1;
      r.riders=r.riders.filter(i=>this.guests[i].state===2);
      if(r.open&&!r.broken&&this.tick%120===id%120){
        for(let j=0;j<18&&r.queue.length;j++){const i=r.queue.shift()!,g=this.guests[i];g.state=2;g.remaining=120;g.cash-=20;this.cash+=20;this.revenue+=20;this.counters.boarded++;r.riders.push(i);}
      }
      if(this.tick%600===id%600)r.broken=true;
    }
    for(const s of this.staff) {
      if(s.job<0){s.job=this.rides.findIndex(r=>r.broken);if(s.job<0)continue;}
      const r=this.rides[s.job];
      if(!r.broken){s.job=-1;s.service=0;continue;}
      if(s.node===r.node){if(++s.service>=20){r.broken=false;s.job=-1;s.service=0;this.counters.staffCompleted++;}continue;}
      if(s.next===s.node)s.next=this.nextNode(s.node,r.node);s.progress+=.2;
      if(s.progress>=1){s.node=s.next;s.next=s.node;s.progress=0;}
    }
    for(let i=0;i<this.spec.cars;i++){const r=this.rides[Math.floor(i/18)],a=this.coordinates(r.node),t=(r.phase+(i%18)/180)*Math.PI*2;this.cars[i*3]=a.x+Math.cos(t)*2;this.cars[i*3+1]=1+Math.sin(t*2)*.5;this.cars[i*3+2]=a.z+Math.sin(t)*2;}
    if(this.tick%512===0){const wages=this.spec.staff*5;this.cash-=wages;this.expenses+=wages;}
  }
  positions(buffer?:ArrayBuffer) {
    const total=this.spec.guests+this.spec.staff+this.spec.cars;
    const data=new Float32Array(buffer??new ArrayBuffer(total*3*4));let cursor=0;
    const put=(x:number,y:number,z:number)=>{data[cursor++]=x;data[cursor++]=y;data[cursor++]=z;};
    for(const g of this.guests){const a=this.coordinates(g.node),b=this.coordinates(g.next);put(a.x+(b.x-a.x)*g.progress,.6,a.z+(b.z-a.z)*g.progress);}
    for(const s of this.staff){const a=this.coordinates(s.node),b=this.coordinates(s.next);put(a.x+(b.x-a.x)*s.progress,.8,a.z+(b.z-a.z)*s.progress);}
    data.set(this.cars,cursor);
    return data;
  }
  save(){return {tier:this.tier,routing:this.routing,tick:this.tick,rng:this.rng,cash:this.cash,revenue:this.revenue,expenses:this.expenses,guests:this.guests,rides:this.rides,staff:this.staff,cars:this.cars,edges:this.edges,edgeRemoved:this.edgeRemoved,counters:this.counters,events:this.events,surface:this.surface,tileRecords:this.tileRecords,initialCash:this.initialCash,initialPocket:this.initialPocket};}
  restore(p:ReturnType<Simulation['save']>){Object.assign(this,structuredClone(p));this.distances.clear();}
  checksum(){const text=JSON.stringify({tick:this.tick,rng:this.rng,cash:this.cash,revenue:this.revenue,expenses:this.expenses,guests:this.guests,staff:this.staff,cars:this.cars,rides:this.rides,edges:this.edges,edgeRemoved:this.edgeRemoved});let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619)>>>0;return h;}
  inspect(){return {tier:this.tier,tick:this.tick,checksum:this.checksum(),cash:this.cash,counts:{...this.spec,rideSlots:this.rides.length+this.spec.shops,totalEntities:this.spec.guests+this.spec.staff+this.spec.cars,tileRecords:this.tileRecords.length/8,pathNodes:this.edges.length,pathEdges:this.edges.reduce((s,a)=>s+a.length,0)/2},states:{walking:this.guests.filter(g=>g.state===0).length,queuing:this.guests.filter(g=>g.state===1).length,riding:this.guests.filter(g=>g.state===2).length},counters:{...this.counters},events:[...this.events],moneyConserved:this.cash+this.guests.reduce((s,g)=>s+g.cash,0)+this.expenses===this.initialCash+this.initialPocket};}
}
