import * as THREE from 'three';
import {Simulation,tiers} from './simulation';
import type {Options} from './worker';
const status=document.getElementById('status')!;
let cleanup=()=>{};
const summary=(values:number[])=>{const a=[...values].sort((x,y)=>x-y);return{n:a.length,p50:a[Math.floor(a.length*.5)]??null,p95:a[Math.floor(a.length*.95)]??null,p99:a[Math.floor(a.length*.99)]??null,max:a.at(-1)??null};};
async function run(options:Options){
  cleanup();
  const errors:string[]=[];const worker=new Worker(new URL('./worker.ts',import.meta.url),{type:'module'});
  let renderer:THREE.WebGLRenderer|undefined,mesh:THREE.InstancedMesh|undefined,scene:THREE.Scene|undefined,camera:THREE.OrthographicCamera|undefined;
  let raf=0,lastFrame=0,latestTick=0,received=0,latestSentAt=0,near=false;const frames:number[]=[],latency:number[]=[],uploads:number[]=[],decode:number[]=[],renderCalls:number[]=[],presentation:number[]=[],overviewFrames:number[]=[],nearFrames:number[]=[],heap:{tick:number,bytes:number}[]=[];
  let bridge:THREE.Mesh|undefined,topology=false;
  let positions:Float32Array|undefined;const matrix=new THREE.Matrix4();let info:unknown=null;
  if(options.render){
    const spec=tiers[options.tier];renderer=new THREE.WebGLRenderer({antialias:false});renderer.setPixelRatio(1);renderer.setSize(1920,1080);document.body.append(renderer.domElement);
    scene=new THREE.Scene();scene.background=new THREE.Color('#b9d8b4');camera=new THREE.OrthographicCamera(-spec.side*.8,spec.side*.8,spec.side*.45,-spec.side*.45,.1,3000);
    camera.position.set(spec.side*1.4,spec.side*1.5,spec.side*1.4);camera.lookAt(spec.side/2,0,spec.side/2);
    const total=spec.guests+spec.staff+spec.cars;mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,1,.5),new THREE.MeshBasicMaterial({color:'#be6b4f'}),total);mesh.frustumCulled=false;scene.add(mesh);
    const fixture=new Simulation(options.tier);
    const paths=new THREE.InstancedMesh(new THREE.BoxGeometry(1.8,.05,1.8),new THREE.MeshBasicMaterial({color:'#eae3ce'}),fixture.edges.length);
    for(let i=0;i<fixture.edges.length;i++){const p=fixture.coordinates(i);matrix.makeTranslation(p.x,.01,p.z);paths.setMatrixAt(i,matrix);}scene.add(paths);
    const edgePairs=fixture.edges.flatMap((a,i)=>a.filter(j=>j>i).map(j=>[i,j]));
    const edgeMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.8,.05,1),new THREE.MeshBasicMaterial({color:'#eae3ce'}),edgePairs.length);let edgeIndex=0;
    for(const [a,b] of edgePairs){const p=fixture.coordinates(a),q=fixture.coordinates(b),distance=Math.hypot(p.x-q.x,p.z-q.z);matrix.makeRotationY(p.x===q.x?0:Math.PI/2);matrix.scale(new THREE.Vector3(1,1,distance));matrix.setPosition((p.x+q.x)/2,.02,(p.z+q.z)/2);
      if(a===Math.floor(fixture.edges.length/2)&&b===a+1){bridge=new THREE.Mesh(edgeMesh.geometry,edgeMesh.material);bridge.matrixAutoUpdate=false;bridge.matrix.copy(matrix);scene.add(bridge);matrix.setPosition(0,-4,0);}
      edgeMesh.setMatrixAt(edgeIndex++,matrix);
    }scene.add(edgeMesh);
    const loops=new THREE.InstancedMesh(new THREE.TorusGeometry(2,.12,4,20),new THREE.MeshBasicMaterial({color:'#c97764'}),spec.coasters);
    fixture.rides.forEach((r,i)=>{const p=fixture.coordinates(r.node);matrix.makeRotationX(Math.PI/2);matrix.setPosition(p.x,1.5,p.z);loops.setMatrixAt(i,matrix);});scene.add(loops);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(spec.side,spec.side),new THREE.MeshBasicMaterial({color:'#90b883'}));ground.rotation.x=-Math.PI/2;ground.position.set(spec.side/2,0,spec.side/2);scene.add(ground);
    const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');info={vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,width:1920,height:1080,pixelRatio:1};
    const draw=(now:number)=>{
      if(latestTick>options.warmup&&lastFrame){frames.push(now-lastFrame);(near?nearFrames:overviewFrames).push(now-lastFrame);}
      lastFrame=now;
      if(latestTick>=800&&!near){near=true;camera!.zoom=2.8;camera!.position.set(spec.side*.6,spec.side*.7,spec.side*.6);camera!.lookAt(spec.side*.12,0,spec.side*.1);camera!.updateProjectionMatrix();}
      if(bridge)bridge.visible=!topology;
      const updated=!!positions;
      if(positions){const before=performance.now();for(let i=0;i<total;i++){matrix.makeTranslation(positions[i*3],positions[i*3+1],positions[i*3+2]);mesh!.setMatrixAt(i,matrix);}mesh!.instanceMatrix.needsUpdate=true;
        if(latestTick>options.warmup)uploads.push(performance.now()-before);positions=undefined;}
      const before=performance.now();renderer!.render(scene!,camera!);
      if(latestTick>options.warmup){renderCalls.push(performance.now()-before);if(updated)presentation.push(performance.timeOrigin+performance.now()-latestSentAt);}
      raf=requestAnimationFrame(draw);
    };raf=requestAnimationFrame(draw);
  }
  const start=performance.now();
  const result=await new Promise<any>((resolve,reject)=>{
    const timeout=setTimeout(()=>{worker.terminate();reject(new Error('Experiment timed out'));},180000);
    worker.onerror=e=>{errors.push(e.message);clearTimeout(timeout);reject(new Error(e.message));};
    worker.onmessage=e=>{
      const data=e.data;
      if(data.type==='snapshot'){
        latestTick=data.tick;received++;latestSentAt=data.sentAt;topology=data.edgeRemoved;
        if(data.tick>options.warmup)latency.push(performance.timeOrigin+performance.now()-data.sentAt);
        const before=performance.now();
        if(data.state){const view=Object.create(Simulation.prototype) as Simulation;Object.assign(view,data.state,{spec:tiers[options.tier]});positions=view.positions();}
        else {positions=new Float32Array(data.positions);if(options.snapshot==='packed-transfer')worker.postMessage({type:'recycle',buffer:data.positions.buffer},[data.positions.buffer]);}
        if(data.tick>options.warmup)decode.push(performance.now()-before);
        if(data.tick%200===0){const memory=(performance as any).memory;if(memory)heap.push({tick:data.tick,bytes:memory.usedJSHeapSize});}
        status.textContent=`${options.tier} · ${options.snapshot}\n${data.tick}/${options.ticks} ticks\n${received} snapshots received`;
      }
      if(data.type==='done'){clearTimeout(timeout);resolve(data);}
    };
    worker.postMessage({type:'start',options});
  });
  worker.terminate();cancelAnimationFrame(raf);
  const renderStats=renderer?{...renderer.info.render}:null;
  const answer={options,totalWallMs:performance.now()-start,elapsedMs:result.elapsedMs,simulatedMs:(options.ticks-options.warmup)*25,stepMs:summary(result.steps),coldStepMs:summary(result.coldSteps),eventSteps:result.events,phaseMix:result.phases,snapshotBuildAndPostMs:summary(result.snapshots),snapshotArrivalMs:summary(latency),decodeMs:summary(decode),backlogTicks:summary(result.lags),entryDelayMs:summary(result.entryDelays),deadlineMisses:result.deadlineMisses,frameMs:summary(frames),overviewFrameMs:summary(overviewFrames),nearFrameMs:summary(nearFrames),uploadMs:summary(uploads),renderSubmissionMs:summary(renderCalls),snapshotToRenderSubmissionMs:summary(presentation),received,dropped:result.dropped,heap,cacheBytes:result.cacheBytes,inspection:result.inspection,renderer:info,renderStats,errors};
  cleanup=()=>{renderer?.dispose();scene?.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});renderer?.domElement.remove();};
  status.textContent=JSON.stringify(answer,null,2);return answer;
}
Object.assign(window,{__experiment:{run,summary,cleanup:()=>cleanup()}});
