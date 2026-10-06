import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const root=process.cwd(),evidence='../evidence';await mkdir(evidence,{recursive:true});
const html=(await readFile('ui/index.html','utf8')).replace('</body>','<script type="module" src="browser-check.js"></script></body>');await writeFile('web-dist/check.html',html);await copyFile('test/browser-check.js','web-dist/browser-check.js');
const child=spawn('../check-venv/bin/python',['scripts/verify-browser-cdp.py'],{stdio:'inherit'});
const code=await new Promise(resolve=>child.on('close',resolve));if(code!==0)process.exit(code??1);
