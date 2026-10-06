import {newPark,steelRules} from '../content/steel-coaster.js';
const e=newPark(),apply=c=>{const q=e.quote(c);if(!q.ok)throw new Error(q.error.message);const r=e.execute(c,q.value.revision);if(!r.ok)throw new Error(r.error.message);return r.value;};
const output={durationMs:30*60*1000,tickHz:40,startTick:e.snapshot().tick,samples:[],actions:[],errors:[]};let last=performance.now(),debt=0,checkpoint=0,broken=false;
function sampled(){const s=e.snapshot(),save=e.exportSave();const imported=e.restoreSave(save);if(!imported.ok)throw new Error(imported.error.message);const view=e.view({bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:false});if(!view.ok)throw new Error(view.error.message);return{wallMs:performance.now()-started,tick:s.tick,backlog:Math.floor(debt),guests:s.people.guests.length,staff:s.staff.length,litter:s.litter.length,cash:s.cash,ledger:s.ledger,heap:performance.memory?.usedJSHeapSize??null,saveBytes:save.length};}
const started=performance.now();
setInterval(()=>{
 if(output.done)return;
 try{const now=performance.now();debt+=(now-last)*40/1000;last=now;const ticks=Math.min(40,Math.floor(debt));if(ticks){const r=e.advance(ticks);if(!r.ok)throw new Error(r.error.message);debt-=ticks;}
 const stage=Math.floor((now-started)/60000);if(stage>checkpoint){checkpoint=stage;apply({type:'set-ride-price',ride:0,price:stage%2?20:30});broken=!broken;apply({type:'set-ride-broken',ride:0,broken});const id=apply({type:'place-path',tile:{x:25,y:12},height:32,queueFor:null}).id;apply({type:'remove-path',id});output.actions.push({stage,tick:e.snapshot().tick,broken,price:stage%2?20:30});output.samples.push(sampled());}
 if(now-started>=output.durationMs){output.samples.push(sampled());output.done=true;output.ok=true;document.body.textContent=JSON.stringify(output);}
 }catch(error){output.errors.push(error.stack??String(error));output.done=true;output.ok=false;document.body.textContent=JSON.stringify(output);}
},25);
output.samples.push(sampled());window.soakEvidence=output;
