import {newPark,steelRules} from '../content/steel-coaster.js';
import {createHost} from './host.js';
import {FixedClock} from './clock.js';
import {ensure,integer,record,result} from './validation.js';
import {WORKER_PROTOCOL_VERSION} from './protocol.js';
const scope=globalThis as unknown as DedicatedWorkerGlobalScope;
let engine=newPark(),host=createHost(engine),paused=false;
const clock=new FixedClock(steelRules.motion.tickHz,performance.now());
let backlog=0;
function drain(){const due=clock.poll(performance.now(),paused);backlog=due.backlog;if(due.ticks){const r=engine.advance(due.ticks);if(!r.ok){paused=true;scope.postMessage({protocolVersion:WORKER_PROTOCOL_VERSION,event:'error',error:r.error});}}}
setInterval(drain,25);
scope.onmessage=event=>{
  drain();const message=event.data;
  if(message?.request?.type==='speed'||message?.request?.type==='new-park'){
    const response=result(()=>{record(message,['id','protocolVersion','request']);ensure(integer(message.id),'INVALID_COMMAND','Invalid request identifier.');ensure(message.protocolVersion===WORKER_PROTOCOL_VERSION,'INVALID_COMMAND','Unsupported worker protocol version.');record(message.request,['type','payload']);
      if(message.request.type==='speed'){const speed=message.request.payload;ensure(integer(speed)&&[1,2,4].includes(speed),'INVALID_COMMAND','Invalid simulation speed.');clock.speed=speed;return clock.speed;}
      ensure(message.request.payload===null,'INVALID_COMMAND','New park takes no payload.');engine=newPark();host=createHost(engine);paused=false;clock.reset(performance.now());return null;
    });scope.postMessage({id:message.id,protocolVersion:WORKER_PROTOCOL_VERSION,result:response});return;
  }
  const response=host(message);
  if(response.ok){if(response.value.result.ok&&message.request?.type==='execute'&&message.request?.payload?.command?.type==='set-paused')paused=message.request.payload.command.paused;
    if(response.value.result.ok&&message.request?.type==='load'){const s=engine.view({bounds:{x0:0,y0:0,x1:0,y1:0},includeStatic:false});if(s.ok)paused=s.value.paused;clock.reset(performance.now());}
    scope.postMessage({...response.value,backlog});
  }else scope.postMessage({id:message?.id??null,protocolVersion:WORKER_PROTOCOL_VERSION,result:response});
};
scope.postMessage({protocolVersion:WORKER_PROTOCOL_VERSION,event:'ready'});
