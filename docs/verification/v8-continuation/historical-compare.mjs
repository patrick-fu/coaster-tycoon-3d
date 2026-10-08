import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const root='/workspace/coaster-v8-golden',left=resolve(root,'evidence/generated'),right=resolve(root,'evidence/replayed');
const sha=b=>createHash('sha256').update(b).digest('hex');
const a=readdirSync(left).sort(),b=readdirSync(right).sort();assert.deepEqual(a,b);
const records=[];
for(const file of a){
 const first=readFileSync(resolve(left,file)),second=readFileSync(resolve(right,file));
 if(file.endsWith('.raw-view.json')){
  const {commandRevision:tokenA,...viewA}=JSON.parse(first),{commandRevision:tokenB,...viewB}=JSON.parse(second);
  assert.match(tokenA,/^[a-f0-9]{32}:0:54$/);assert.match(tokenB,/^[a-f0-9]{32}:0:54$/);
  assert.deepEqual(viewA,viewB,`All raw view fields except the declared nonpersisted session quote token must agree: ${file}`);
  assert.equal(JSON.stringify(viewA),JSON.stringify(viewB));
  records.push({file,comparison:'byte-identical JSON after removing only commandRevision',canonicalSha256:sha(JSON.stringify(viewA)),rawSha256:{first:sha(first),second:sha(second)},omittedField:'commandRevision',omissionReason:'Frozen Engine uses crypto.getRandomValues for its ephemeral per-Engine session quote token.'});
 }else{
  assert.deepEqual(first,second,`All other golden evidence must be byte-identical: ${file}`);
  records.push({file,comparison:'byte-identical complete file',sha256:sha(first)});
 }
}
const report={status:'PASS',sourceCommit:'9ed66bacb964cb418810d8fe7f40064a18ec4800',filesCompared:a.length,fullByteIdenticalFiles:records.filter(r=>!r.omittedField).length,canonicalViews:records.filter(r=>r.omittedField).length,initialFullDirectoryDiff:{exit:1,reason:'Only 10 raw view commandRevision tokens differed; save bytes, car poses, canonical fixture and summary were identical.',stdout:'byte-reproducibility.stdout.log'},records};
writeFileSync(resolve(root,'evidence/reproducibility.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,filesCompared:report.filesCompared,fullByteIdenticalFiles:report.fullByteIdenticalFiles,canonicalViews:report.canonicalViews,omittedFields:['commandRevision']},null,2));
