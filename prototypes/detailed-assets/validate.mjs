import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=process.argv[2];
const require=createRequire(path.join(root,'checks/package.json'));
const validator=require('gltf-validator');
const records=[];
for(const id of ['wooden-car','timber-station','information-kiosk']){
 const file=path.join(root,'outputs',id+'.glb'),bytes=await readFile(file);
 const report=await validator.validateBytes(new Uint8Array(bytes),{uri:id+'.glb',maxIssues:1000});
 await writeFile(path.join(root,'checks',id+'-validator.json'),JSON.stringify(report,null,2)+'\n');
 const headerLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+headerLength).toString());
 const metadata=JSON.parse(await readFile(path.join(root,'outputs',id+'.json'),'utf8'));
 const nodes=new Map(gltf.nodes.map(n=>[n.name,n]));
 const missingAnchors=metadata.authoring.anchors.filter(name=>!nodes.has(name));
 const issues=[];
 if(report.issues.numErrors)issues.push(`${report.issues.numErrors} glTF validation errors`);
 if(missingAnchors.length)issues.push('Missing exported anchors: '+missingAnchors.join(', '));
 if(id==='wooden-car'&&metadata.authoring.anchors.filter(n=>n.startsWith('Seat_')).length!==4)issues.push('Four authored seats required');
 if(id==='timber-station'){
  const a=nodes.get('RailIn')?.translation,b=nodes.get('RailOut')?.translation;
  if(!a||!b||Math.abs(Math.hypot(...a.map((n,i)=>n-b[i]))-4)>.0001)issues.push('Station rail anchors must repeat exactly 4 m');
 }
 const record={asset:id,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,
  validatorVersion:validator.version(),errors:report.issues.numErrors,warnings:report.issues.numWarnings,
  warningCodes:[...new Set(report.issues.messages.filter(m=>m.severity===1).map(m=>m.code))],
  meshNodes:gltf.nodes.filter(n=>n.mesh!==undefined).length,materials:gltf.materials.length,embeddedImages:gltf.images.length,
  exportedAnchors:metadata.authoring.anchors.map(name=>({name,translation:nodes.get(name)?.translation??[0,0,0]})),issues};
 records.push(record);console.log(JSON.stringify(record));
}
await writeFile(path.join(root,'checks/validation.json'),JSON.stringify({scope:'Remote structural/semantic GLB checks; original behavior and human visual acceptance unverified',records},null,2)+'\n');
if(records.some(r=>r.issues.length))process.exitCode=1;
