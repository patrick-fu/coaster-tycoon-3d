import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Engine,WORKER_PROTOCOL_VERSION} from '../dist/simulation/index.js';
import {createHost} from '../dist/simulation/host.js';
import {mixedRules} from '../dist/content/mixed-park.js';
import {withFlumeProfile} from '../dist/content/log-flume.js';
import {withConsumablesProfile} from '../dist/content/consumables.js';
import {withDetailedStallsProfile,withInformationProfile} from '../dist/content/facility-profiles.js';
import {withGradualRestroomProfile} from '../dist/content/gradual-restroom.js';
import {withAtmProfile} from '../dist/content/atm.js';
import {beforeAtmState} from './atm-fixtures.mjs';

const fixtureDirectory=process.env.COASTER_RULES_REGRESSION_FIXTURES
 ?pathToFileURL(resolve(process.env.COASTER_RULES_REGRESSION_FIXTURES)+'/')
 :new URL('fixtures/cross-runtime-rules/',import.meta.url);
const sha=text=>createHash('sha256').update(text).digest('hex');
function fixture(name,expectedHash){
 const raw=gunzipSync(readFileSync(new URL(name+'.save.json.gz',fixtureDirectory))).toString('utf8');
 assert.equal(sha(raw),expectedHash,'Immutable actual fixture changed: '+name);
 return{raw,state:JSON.parse(raw)};
}
const node16=fixture('node16','dbc75c286cc78bd555e088f6e3e31d353a00787eeb8aff30195b36adf5a94762');
const browser16=fixture('browser16','e1b2e11977dd67a3743659f114336291b8a731e0e1ffa8d5bd39ff81260f9665');
const browser15=fixture('genuine-browser15','5c14b5f50140e18811ef727943966b3706d213b1430582d93ca1f3b7967f2496');
const nodeHash='188290ca68d5e907cb93173be32e1b66467fc19ac40bd9ac19822eafb269673e';
const browserHash='9ecebaff89fbf6588913938f91c93fedf5434d6f925c69289794b481e4956161';
const oldBrowserHash='d1d3d4bb9309e7aa230e7d1e248a92544e21c01aca691612918111e363fb84a5';
const browserRules=JSON.parse(browser16.state.rules);
const options={side:48,cash:500000,maxLoan:200000,seed:20261007};
const currentRules=()=>{
 const legacy=structuredClone(mixedRules);delete legacy.rideProfiles['independent.wooden-rise-return-v2'];
 return withAtmProfile(withGradualRestroomProfile(withInformationProfile(withDetailedStallsProfile(withConsumablesProfile(withFlumeProfile(legacy))))));
};
const fresh=()=>new Engine(options,currentRules());
function received16(state){
 assert.equal(state.version,16);assert.equal(state.contentVersion,9);
 return Object.assign(structuredClone(state),{version:17,contentVersion:10});
}

function client(engine){
 const host=createHost(engine);let id=0;
 return(type,payload=null)=>{
  const requestId=++id,reply=host({id:requestId,protocolVersion:WORKER_PROTOCOL_VERSION,request:{type,payload}});
  assert.equal(reply.ok,true,'Host envelope failed: '+JSON.stringify(reply));
  assert.equal(reply.value.id,requestId);assert.equal(reply.value.protocolVersion,10);
  return reply.value.result;
 };
}
function ok(reply,label){
 assert.equal(reply.ok,true,label+': '+JSON.stringify(reply));
 return reply.value;
}
function execute(call,command){
 const quote=ok(call('quote',command),'quote '+command.type);
 return ok(call('execute',{command,revision:quote.revision}),'execute '+command.type);
}
function projectedBank(call,expected){
 const view=ok(call('view',{bounds:{x0:0,y0:0,x1:47,y1:47},includeStatic:false}),'profile view');
 const wooden=view.rides.find(r=>r.content.familyId==='independent.wooden-circuit-coaster');
 const flume=view.rides.find(r=>r.content.familyId==='independent.log-flume');
 assert(wooden&&flume,'Real Classic must expose both active receiving profiles.');
 // Persisted Rules cannot encode signed zero; retain exact comparisons for every nonzero bank value.
 assert.deepEqual(JSON.parse(JSON.stringify(wooden.trackProfile.pieces)),expected.rideProfiles['independent.wooden-circuit-v1'].pieces,'Active wooden Rules must match the saved bank.');
 assert.deepEqual(JSON.parse(JSON.stringify(flume.channelProfile.pieces)),expected.channelProfiles['independent.log-flume-v1'].pieces,'Active channel Rules must match the saved bank.');
}

test('fresh public Engine retains the complete recorded Node Rules profile',()=>{
 assert.equal(sha(node16.state.rules),nodeHash);
 assert.equal(sha(browser16.state.rules),browserHash);
 assert.equal(sha(browser15.state.rules),oldBrowserHash);
 assert.notEqual(node16.state.rules,browser16.state.rules,'Actual historical runtime banks must remain distinct.');
 const engine=fresh(),call=client(engine),saved=JSON.parse(ok(call('save'),'fresh save'));
 assert.equal(saved.version,17);assert.equal(saved.contentVersion,10);
 assert.equal(saved.rules,node16.state.rules,'No new price/physics/footprint or curve profile may replace the recorded default.');
});

for(const [label,input,expectedHash] of [['Node16 actual',node16,nodeHash],['Browser16 actual',browser16,browserHash]]){
 test(label+' loads through Host and roundtrips the exact current migration with original Rules',()=>{
  const engine=fresh(),call=client(engine),expected=received16(input.state),expectedSave=JSON.stringify(expected);
  ok(call('load',input.raw),'actual load');
  assert.deepEqual(engine.snapshot(),expected);
  assert.equal(ok(call('save'),'roundtrip save'),expectedSave);
  assert.equal(sha(engine.snapshot().rules),expectedHash);
  if(input===browser16)projectedBank(call,browserRules);
  const receiver=fresh(),second=client(receiver);
  ok(second('load',ok(call('save'),'transfer save')),'second receiving');
  assert.equal(ok(second('save'),'second export'),expectedSave);
  if(input===browser16)projectedBank(second,browserRules);
 });
}

test('genuine Browser15 migrates ATM fields and current versions while preserving its observed curve bank',()=>{
 const engine=fresh(),call=client(engine);
 ok(call('load',browser15.raw),'genuine15 load');
 const expected=structuredClone(browser15.state);
 for(const guest of expected.people.guests){guest.withdrawn=0;guest.atmRefusal=null;}
 expected.people.departedWithdrawn=0;
 Object.assign(expected,{version:17,contentVersion:10,rules:browser16.state.rules,retiredAtmWithdrawals:0});
 assert.deepEqual(engine.snapshot(),expected,'Unrelated park, ownership, finance or simulation state changed during old15 migration.');
 assert.equal(ok(call('save'),'migrated save'),JSON.stringify(expected));
 assert.equal(sha(engine.snapshot().rules),browserHash);
 projectedBank(call,browserRules);
 const receiver=fresh(),second=client(receiver);
 ok(second('load',ok(call('save'),'migrated transfer')),'migrated17 receiving');
 assert.deepEqual(receiver.snapshot(),expected);projectedBank(second,browserRules);
});

test('synthetic Node15 scaffold from actual Node16 retains the Node bank (not genuine legacy evidence)',()=>{
 const synthetic=beforeAtmState(node16.state),engine=fresh(),call=client(engine);
 assert.equal(synthetic.version,15);assert.equal(synthetic.contentVersion,8);
 ok(call('load',JSON.stringify(synthetic)),'synthetic Node15 load');
 assert.deepEqual(engine.snapshot(),received16(node16.state));
 assert.equal(engine.snapshot().rules,node16.state.rules);
 const receiver=fresh();ok(client(receiver)('load',ok(call('save'),'synthetic migrated transfer')),'synthetic migrated17 load');
 assert.deepEqual(receiver.snapshot(),received16(node16.state));
});

test('actual Browser16 continues under its selected bank with equivalent real tick batches',()=>{
 const engine=fresh(),call=client(engine);
 ok(call('load',browser16.raw),'canonical receiver load');
 // The independent reference starts with the actual saved numerical Rules, not a compatibility helper.
 const reference=new Engine(options,browserRules),other=client(reference);
 ok(other('load',browser16.raw),'historical-profile receiver load');
 execute(call,{type:'set-paused',paused:false});execute(other,{type:'set-paused',paused:false});
 ok(call('advance',64),'single tick batch');
 ok(other('advance',17),'first tick batch');ok(other('advance',47),'second tick batch');
 assert.equal(engine.snapshot().tick,browser16.state.tick+64);
 assert.equal(ok(call('save'),'continued save'),ok(other('save'),'reference continuation'));
 assert.equal(engine.snapshot().rules,browser16.state.rules);
 projectedBank(call,browserRules);
 const receiver=fresh(),second=client(receiver);ok(second('load',ok(call('save'),'continuation transfer')),'running continuation receiving');
 assert.equal(ok(second('save'),'running re-export'),ok(call('save'),'running original'));
});

const ruleMutations=[
 ['price',rules=>{rules.pieces.station.price++;}],
 ['physics',rules=>{rules.motion.gravity++;}],
 ['footprint',rules=>{rules.rideProfiles['independent.wooden-circuit-v1'].footprints.flat[0][0].high+=8;}],
 ['noncurve sample',rules=>{rules.pieces.flat.motion.samples[8].y=1e-9;}],
 ['tiny unobserved curve value',rules=>{rules.pieces.left.motion.samples[15].y+=1e-12;}],
 ['hybrid observed bank',rules=>{rules.pieces.left.motion.samples[15].y=browserRules.pieces.left.motion.samples[15].y;}],
];

function rejectedWithoutMutation(input,expectedCode){
 const engine=fresh(),call=client(engine);
 ok(call('load',browser16.raw),'original Browser bank load');
 const before=ok(call('save'),'before failed receiving'),revision=engine.revision;
 const command={type:'set-loan',amount:1000},quote=ok(call('quote',command),'pending finance quote');
 const rejected=call('load',JSON.stringify(input));
 assert.equal(rejected.ok,false,'Altered/invalid receiving was accepted.');
 assert.equal(rejected.error.code,expectedCode);
 assert.equal(ok(call('save'),'after rejected receiving'),before);
 assert.equal(engine.revision,revision,'Rejected receiving invalidated the original quote revision.');
 projectedBank(call,browserRules);
 ok(call('execute',{command,revision:quote.revision}),'old pending quote after rollback');
 assert.equal(engine.snapshot().loan,1000);
 assert.equal(engine.snapshot().cash,browser16.state.cash+1000-browser16.state.loan);
 assert.equal(engine.snapshot().rules,browser16.state.rules);
 projectedBank(call,browserRules);
}

for(const [label,mutate] of ruleMutations){
 test(label+' cannot enter via curve-bank compatibility and leaves the previous bank/quote intact',()=>{
  const input=structuredClone(node16.state),rules=JSON.parse(input.rules);
  mutate(rules);input.rules=JSON.stringify(rules);
  assert.notEqual(input.rules,node16.state.rules);
  assert.notEqual(input.rules,browser16.state.rules);
  rejectedWithoutMutation(input,'WRONG_RULES');
 });
}

test('failure after selecting the opposite valid bank atomically restores previous active Rules and quote',()=>{
 const input=structuredClone(node16.state);
 input.cash++;
 assert.equal(input.rules,node16.state.rules,'Incoming Rules must be a valid opposite bank; failure must be park validation.');
 rejectedWithoutMutation(input,'INVALID_SAVE');
});
