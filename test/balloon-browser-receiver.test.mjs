import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Engine,WORKER_PROTOCOL_VERSION} from '../dist/simulation/index.js';
import {createHost} from '../dist/simulation/host.js';
import {browserRules,legacyBrowserRules,restoreBrowserPark} from '../dist/content/browser-park.js';
import {initialWorld} from '../dist/content/steel-coaster.js';

// Genuine unmodified Node v17 CPU factory output, not a browser/profile backup or a synthetic downgrade.
// runtime/grove-hedge-build-sol-high-r1/actual-run-r1/mirror/evidence/classic-factory4800.save.json
const originalHash='d65bbe85b40cf853ad223ef52c19ec2cc44e938ca07700fec2aa55995e2d7a7b';
const fixtureDirectory=process.env.COASTER_RULES_REGRESSION_FIXTURES
 ?pathToFileURL(resolve(process.env.COASTER_RULES_REGRESSION_FIXTURES)+'/')
 :new URL('fixtures/cross-runtime-rules/',import.meta.url);
const raw=gunzipSync(readFileSync(new URL('genuine-node17.save.json.gz',fixtureDirectory))).toString('utf8');
assert.equal(Buffer.byteLength(raw),859651);assert.equal(createHash('sha256').update(raw).digest('hex'),originalHash);
const original=JSON.parse(raw),ok=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.value;};
function client(engine){const host=createHost(engine);let id=0;return(type,payload=null)=>{
 const requestId=++id,envelope=ok(host({id:requestId,protocolVersion:WORKER_PROTOCOL_VERSION,request:{type,payload}}));
 assert.equal(envelope.id,requestId);assert.equal(envelope.protocolVersion,11);return envelope.result;
};}
function execute(call,command){const q=ok(call('quote',command));return ok(call('execute',{command,revision:q.revision}));}
function expectedMigration(){
 const expected=structuredClone(original),profile=JSON.parse(expected.rules);
 assert.equal(expected.version,17);assert.equal(expected.contentVersion,10);
 assert(!Object.hasOwn(profile,'balloonProfiles'));assert(!Object.hasOwn(profile.facilityProfiles,'independent.balloon-stall-v1'));
 for(const guest of expected.people.guests)guest.balloonColour=null;
 Object.assign(expected,{version:18,contentVersion:11,rules:JSON.stringify({...profile,balloonProfiles:{}}),retiredBalloon:{sales:0,income:0}});
 return expected;
}
function balloonAvailable(engine){
 const variant=engine.catalogue().variants.find(v=>v.id==='independent.timber-balloon-stall');
 assert(variant);return variant.choices.some(c=>c.runtimeAvailable);
}
const place={type:'place-facility',name:'Receiving balloon stall',kind:'balloon',tile:{x:5,y:5},height:32,direction:0};
function wrongRules(mutator){const state=structuredClone(original),bank=JSON.parse(state.rules);mutator(bank);state.rules=JSON.stringify(bank);return state;}
function rejectsWithoutReplacement(input,code){
 const seed=new Engine(initialWorld,browserRules);execute(client(seed),place);
 const active=restoreBrowserPark(seed.exportSave()),call=client(active),before=active.exportSave(),revision=active.revision;
 const command={type:'set-paused',paused:true},quote=ok(call('quote',command));
 assert.throws(()=>restoreBrowserPark(JSON.stringify(input)),error=>error.code===code);
 const rejected=call('load',JSON.stringify(input));assert.equal(rejected.ok,false);assert.equal(rejected.error.code,code);
 assert.equal(active.exportSave(),before);assert.equal(active.revision,revision);assert.equal(balloonAvailable(active),true);
 // In particular, a failed v17 load must not leave an enabled park using the legacy receiver bank.
 ok(call('execute',{command,revision:quote.revision}));execute(call,{type:'set-paused',paused:false});
 const reference=restoreBrowserPark(before),other=client(reference);execute(other,command);execute(other,{type:'set-paused',paused:false});
 ok(call('advance',1));ok(other('advance',1));assert.equal(active.exportSave(),reference.exportSave());
}

test('genuine Node17 migrates the entire actual park with only explicit v18 fields and no balloon authority',()=>{
 const expected=expectedMigration(),received=restoreBrowserPark(raw),call=client(received);
 assert.deepEqual(received.snapshot(),expected,'Migration changed an unrelated world, Rules value, guest, ride, finance or RNG field.');
 assert.equal(ok(call('save')),JSON.stringify(expected));assert.equal(balloonAvailable(received),false);
 const quote=call('quote',place);assert.equal(quote.ok,false);assert.equal(quote.error.code,'UNSUPPORTED_CONTENT');
 const again=restoreBrowserPark(ok(call('save')));assert.equal(again.exportSave(),JSON.stringify(expected));
 const projected=JSON.parse(again.snapshot().rules);delete projected.balloonProfiles;assert.equal(JSON.stringify(projected),original.rules);
});

test('genuine Node17 has full-state deterministic continuation under its exact saved numerical Rules',()=>{
 const received=restoreBrowserPark(raw),call=client(received);
 // Independent current-kernel reference uses the recorded Rules and explicit migration, not the trusted receiver selector.
 // This is not evidence of continuation under the historical binary, which is not run by this test.
 const reference=new Engine(initialWorld,JSON.parse(original.rules)),other=client(reference);
 ok(other('load',JSON.stringify(expectedMigration())));
 execute(call,{type:'set-paused',paused:false});execute(other,{type:'set-paused',paused:false});
 ok(call('advance',64));ok(other('advance',17));ok(other('advance',47));
 assert.equal(received.snapshot().tick,original.tick+64);assert.equal(received.exportSave(),reference.exportSave());
 const next=restoreBrowserPark(received.exportSave());assert.equal(next.exportSave(),received.exportSave());assert.equal(balloonAvailable(next),false);
});

test('trusted enabled and legacy receivers can alternate without deriving Rules from a save',()=>{
 const enabled=new Engine(initialWorld,browserRules),enabledCall=client(enabled);execute(enabledCall,place);
 const enabledRaw=enabled.exportSave(),received=restoreBrowserPark(enabledRaw);
 assert.equal(received.exportSave(),enabledRaw);assert.equal(balloonAvailable(received),true);assert.equal(received.snapshot().facilities[0].kind,'balloon');
 const legacy=new Engine(initialWorld,legacyBrowserRules),legacyRaw=legacy.exportSave(),old=restoreBrowserPark(legacyRaw);
 assert.equal(old.exportSave(),legacyRaw);assert.equal(balloonAvailable(old),false);assert.equal(old.quote(place).error.code,'UNSUPPORTED_CONTENT');
 const historical=restoreBrowserPark(raw);assert.equal(balloonAvailable(historical),false);
 const current=restoreBrowserPark(enabledRaw);assert.equal(current.exportSave(),enabledRaw);assert.equal(balloonAvailable(current),true);
 const foreign=structuredClone(browserRules);foreign.services.buildPrice++;
 const foreignEngine=new Engine(initialWorld,foreign),foreignRaw=foreignEngine.exportSave(),ownReceiver=new Engine(initialWorld,foreign);
 ok(ownReceiver.restoreSave(foreignRaw));assert.equal(ownReceiver.exportSave(),foreignRaw,'The foreign bank is valid only under its own explicit authority.');
 assert.throws(()=>restoreBrowserPark(foreignRaw),error=>error.code==='WRONG_RULES');assert.equal(current.exportSave(),enabledRaw);
});

for(const [label,mutate]of [
 ['future content version',s=>{s.contentVersion=11;}],
 ['future guest field',s=>{s.people.guests[0].balloonColour=null;}],
 ['future retired account',s=>{s.retiredBalloon={sales:0,income:0};}],
 ['corrupt original finance',s=>{s.cash++;}],
])test('full genuine17 validation rejects '+label+' before migration and preserves the active receiver',()=>{
 const invalid=structuredClone(original);mutate(invalid);rejectsWithoutReplacement(invalid,'INVALID_SAVE');
});

for(const [label,mutate]of [
 ['foreign price',r=>{r.services.buildPrice++;}],
 ['tiny noncanonical historical curve',r=>{r.pieces.left.motion.samples[15].y+=1e-12;}],
 ['premature even-empty balloon bank',r=>{r.balloonProfiles={};}],
])test(label+' cannot obtain trusted Rules authority through a historical save',()=>{
 rejectsWithoutReplacement(wrongRules(mutate),'WRONG_RULES');
});
