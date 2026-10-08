import {cp,mkdir,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
await rm('web-dist',{recursive:true,force:true});
await mkdir('web-dist/vendor',{recursive:true});
await cp('ui','web-dist',{recursive:true});
await cp('dist','web-dist',{recursive:true});
for(const name of ['three.module.js','three.core.js'])await cp(`node_modules/three/build/${name}`,`web-dist/vendor/${name}`);
await cp('node_modules/three/examples/jsm/controls/OrbitControls.js','web-dist/vendor/OrbitControls.js');
const addons=path.resolve('node_modules/three/examples/jsm'),copied=new Set();
async function copyAddon(relative){
 const source=path.resolve(addons,relative);
 if(!source.startsWith(addons+path.sep))throw new Error('Addon dependency escapes Three.js source.');
 if(copied.has(source))return;
 copied.add(source);
 const target=path.join('web-dist/vendor/addons',path.relative(addons,source));
 await mkdir(path.dirname(target),{recursive:true});await cp(source,target);
 for(const match of (await readFile(source,'utf8')).matchAll(/from\s+['"](\.{1,2}\/[^'"]+\.js)['"]/g))await copyAddon(path.relative(addons,path.resolve(path.dirname(source),match[1])));
}
await copyAddon('loaders/GLTFLoader.js');
await cp('node_modules/three/LICENSE','web-dist/vendor/THREE-LICENSE.txt');
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md'])await cp(name,`web-dist/${name}`);
