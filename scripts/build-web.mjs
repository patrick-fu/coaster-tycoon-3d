import {cp,mkdir,rm} from 'node:fs/promises';
await rm('web-dist',{recursive:true,force:true});
await mkdir('web-dist/vendor',{recursive:true});
await cp('ui','web-dist',{recursive:true});
await cp('dist','web-dist',{recursive:true});
for(const name of ['three.module.js','three.core.js'])await cp(`node_modules/three/build/${name}`,`web-dist/vendor/${name}`);
await cp('node_modules/three/examples/jsm/controls/OrbitControls.js','web-dist/vendor/OrbitControls.js');
await cp('node_modules/three/LICENSE','web-dist/vendor/THREE-LICENSE.txt');
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md'])await cp(name,`web-dist/${name}`);
