import {Engine} from './engine.js';
import {ensure,integer,record,result} from './validation.js';
import {WORKER_PROTOCOL_VERSION} from './protocol.js';
export function createHost(engine:Engine){return(message:unknown)=>result(()=>{
  ensure(message!==null&&typeof message==='object','INVALID_COMMAND','Expected a request envelope.');
  const id=Object.getOwnPropertyDescriptor(message,'id')?.value;
  ensure(integer(id),'INVALID_COMMAND','Invalid request identifier.');
  const handled=result(()=>{
    record(message,['id','protocolVersion','request']);ensure(message.protocolVersion===WORKER_PROTOCOL_VERSION,'INVALID_COMMAND','Unsupported worker protocol version.');const {request}=message;
    record(request,['type','payload']);
    switch(request.type){
      case 'view':return engine.view(request.payload);
      case 'catalogue':ensure(request.payload===null,'INVALID_COMMAND','Catalogue request takes no payload.');return{ok:true as const,value:engine.catalogue()};
      case 'inspect':record(request.payload,['kind','id']);return engine.inspect(request.payload.kind,request.payload.id);
      case 'quote':return engine.quote(request.payload);
      case 'execute':record(request.payload,['command','revision']);return engine.execute(request.payload.command,request.payload.revision as string);
      case 'advance':return engine.advance(request.payload as number);
      case 'save':ensure(request.payload===null,'INVALID_COMMAND','Save request takes no payload.');return{ok:true as const,value:engine.exportSave()};
      case 'load':return engine.restoreSave(request.payload);
      default:ensure(false,'INVALID_COMMAND','Unknown worker request.');
    }
  });
  return{id,protocolVersion:WORKER_PROTOCOL_VERSION,result:handled.ok?handled.value:handled};
});}
