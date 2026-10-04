import {Simulation,type Tier} from './simulation';
export type Options={tier:Tier,render:boolean,snapshot:'none'|'full'|'packed-clone'|'packed-transfer',routing:'cached'|'uncached',realtime:boolean,ticks:number,warmup:number};
let sim:Simulation,options:Options,timer:ReturnType<typeof setTimeout>,origin=0,started=0,steps:number[]=[],snapshots:number[]=[],lags:number[]=[],entryDelays:number[]=[],coldSteps:number[]=[],buffers:ArrayBuffer[]=[],dropped=0,deadlineMisses=0;
const phases:{tick:number,walking:number,queuing:number,riding:number,searches:number}[]=[],events:{tick:number,ms:number,kind:string}[]=[];
onmessage=(event:MessageEvent)=>{
  if(event.data.type==='recycle'){buffers.push(event.data.buffer);return;}
  if(event.data.type==='stop'){clearTimeout(timer);return;}
  options=event.data.options;sim=new Simulation(options.tier,options.routing);
  buffers=Array.from({length:6},()=>new ArrayBuffer((sim.spec.guests+sim.spec.staff+sim.spec.cars)*12));
  started=performance.now();origin=started;
  postMessage({type:'ready',counts:sim.inspect().counts});pump();
};
function snapshot(){
  const before=performance.now();const meta={tick:sim.tick,edgeRemoved:sim.edgeRemoved,sentAt:performance.timeOrigin+performance.now()};
  if(options.snapshot==='full')postMessage({type:'snapshot',...meta,state:sim.save()});
  else if(options.snapshot!=='none'){
    let buffer:ArrayBuffer|undefined;
    if(options.snapshot==='packed-transfer'){buffer=buffers.pop();if(!buffer){dropped++;return;}}
    const positions=sim.positions(buffer);postMessage({type:'snapshot',...meta,positions},options.snapshot==='packed-transfer'?[positions.buffer]:[]);
  }
  if(sim.tick>options.warmup&&options.snapshot!=='none')snapshots.push(performance.now()-before);
}
function pump(){
  const due=options.realtime?Math.floor((performance.now()-origin)/25):sim.tick+8;
  let count=0;
  while(sim.tick<Math.min(due,options.ticks)&&count++<20){
    if(options.realtime&&sim.tick>=options.warmup)entryDelays.push(Math.max(0,performance.now()-origin-(sim.tick+1)*25));
    const before=performance.now();sim.step();
    if(sim.tick===960){const saved=structuredClone(sim.save());sim.restore(saved);}
    const ms=performance.now()-before;
    if(sim.tick>options.warmup)steps.push(ms);else coldSteps.push(ms);
    if([400,600,960,1200,1400].includes(sim.tick))events.push({tick:sim.tick,ms,kind:sim.tick===960?'save-restore':'topology-edit'});
    if(sim.tick%40===0)phases.push({tick:sim.tick,walking:sim.guests.filter(g=>g.state===0).length,queuing:sim.guests.filter(g=>g.state===1).length,riding:sim.guests.filter(g=>g.state===2).length,searches:sim.counters.searches});
    if(sim.tick===options.warmup)started=performance.now();
    if(sim.tick%4===0)snapshot();
    if(options.realtime&&sim.tick>options.warmup&&performance.now()-origin-sim.tick*25>25)deadlineMisses++;
  }
  if(sim.tick>options.warmup&&options.realtime)lags.push(Math.max(0,Math.floor((performance.now()-origin)/25)-sim.tick));
  if(sim.tick>=options.ticks){
    postMessage({type:'done',steps,coldSteps,snapshots,lags,entryDelays,deadlineMisses,events,phases,dropped,elapsedMs:performance.now()-started,inspection:sim.inspect(),cacheBytes:[...sim.distances.values()].reduce((n,a)=>n+a.byteLength,0)});return;
  }
  timer=setTimeout(pump,options.realtime?Math.max(1,Math.min(5,(sim.tick+1)*25-(performance.now()-origin))):0);
}
