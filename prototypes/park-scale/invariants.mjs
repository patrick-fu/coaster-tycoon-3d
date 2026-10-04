import assert from 'node:assert/strict';
import {Simulation} from './.check/simulation.js';
const checkMembership=sim=>{
  const seen=new Set();for(const r of sim.rides){for(const id of r.queue){assert.equal(sim.guests[id].state,1);assert(!seen.has(id));seen.add(id);}for(const id of r.riders)assert.equal(sim.guests[id].state,2);}
  assert.equal(seen.size,sim.guests.filter(g=>g.state===1).length);
  assert(sim.inspect().moneyConserved);assert.equal(sim.guests.filter(g=>g.state>=0&&g.state<=2).length,sim.spec.guests);
};
for(const tier of ['ordinary','large']){
  const sim=new Simulation(tier);
  assert(sim.inspect().counts.totalEntities<=10000);assert(sim.inspect().counts.rideSlots<=255);assert(sim.inspect().counts.tileRecords<=196096);
  for(let i=0;i<1600;i++){sim.step();if(i%40===0)checkMembership(sim);}
  assert(sim.counters.boarded>0);assert(sim.counters.completed>0);assert(sim.counters.purchases>0);assert.equal(sim.counters.edits,4);assert(sim.counters.searchNodes>0);
  const saved=structuredClone(sim.save()),restored=new Simulation(tier);restored.restore(saved);
  for(let i=0;i<200;i++){sim.step();restored.step();}
  const authoritative=state=>{const copy=structuredClone(state);delete copy.counters.searches;delete copy.counters.searchNodes;return copy;};
  assert.deepEqual(authoritative(restored.save()),authoritative(sim.save()));checkMembership(sim);
  const a=new Simulation(tier,'cached'),b=new Simulation(tier,'uncached');
  for(let i=0;i<640;i++){a.step();b.step();}
  for(const key of ['tick','rng','cash','revenue','expenses','guests','rides','staff','edges','events'])assert.deepEqual(a[key],b[key],`${tier} ${key}`);
  assert(a.counters.searchNodes<b.counters.searchNodes);
}
const sim=new Simulation('ordinary');sim.guests[0].state=1;sim.guests[0].target=0;sim.rides[0].queue.push(0);
sim.field(sim.rides[0].node);assert(sim.distances.size>0);sim.mutate(true);
assert.equal(sim.rides[0].queue.length,0);assert.equal(sim.guests[0].state,0);assert.equal(sim.distances.size,0);assert.equal(sim.counters.queueReleased,1);
const a=Math.floor(sim.edges.length/2),b=a+1;assert(!sim.edges[a].includes(b));sim.mutate(false);assert(sim.edges[a].includes(b));assert(sim.inspect().moneyConserved);
console.log(JSON.stringify({passed:true,checks:['entity/ride/tile fixture envelope','queue membership and money conservation','actual boarding, completion and purchases','save/restore deterministic continuation','cached/uncached behavioral equivalence across path mutation','occupied queue release and route invalidation']}));
const service=new Simulation('ordinary');service.tick=100;
service.staff=[{node:service.rides[1].node,next:service.rides[1].node,progress:0,job:0,service:19}];
service.rides[0].broken=false;service.rides[1].broken=true;
service.step();assert.equal(service.staff[0].service,0);
for(let i=0;i<19;i++)service.step();assert.equal(service.rides[1].broken,true);
service.step();assert.equal(service.rides[1].broken,false);
console.log('Passed: service progress does not carry between jobs.');
