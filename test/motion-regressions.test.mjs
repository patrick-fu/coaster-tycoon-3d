import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../dist/simulation/index.js';
import {apply,append,create,operatingPark,ride,rules,options} from './fixtures.mjs';

test('unrepresentable force updates reject the complete tick batch without changing a restorable park',()=>{
 const profile=structuredClone(rules);Object.assign(profile.motion,{tileMetres:1,tickHz:1000,gravity:1,stationSpeed:100000,carLength:1,waitTicks:1});
 const e=new Engine({...options,side:128,cash:20000},profile),id=ride(e);
 for(const piece of ['station','station',...Array(99).fill('flat'),'right','right',...Array(101).fill('flat'),'right','right'])append(e,id,piece);
 for(const [station,role,x] of [[1,'entrance',10],[2,'exit',11]])apply(e,{type:'place-portal',ride:id,station,role,tile:{x,y:9},height:32,direction:1});
 const small=ride(e,{x:5,y:20}),stationIds=[];
 for(const piece of ['station','station','right','right','flat','flat','right','right']){const section=append(e,small,piece);if(piece==='station')stationIds.push(section.id);}
 for(const [station,role,x] of [[stationIds[0],'entrance',5],[stationIds[1],'exit',6]])apply(e,{type:'place-portal',ride:small,station,role,tile:{x,y:19},height:32,direction:1});
 apply(e,{type:'set-ride-status',ride:small,status:'testing'});apply(e,{type:'set-ride-status',ride:id,status:'testing'});const before=e.exportSave();
 const next=e.advance(2);assert.equal(next.ok,false);assert.equal(next.error.code,'CAPACITY');assert.equal(e.exportSave(),before);
 assert(e.advance(1).ok);assert(e.restoreSave(e.exportSave()).ok);const afterOne=e.exportSave();assert.equal(e.advance(1).error.code,'CAPACITY');assert.equal(e.exportSave(),afterOne);
});
test('a vertical initial tangent has finite orientation and measurements and preserves save continuation',()=>{
 const profile=structuredClone(rules);profile.pieces.station.motion.samples=[{x:0,y:0,z:0},{x:0,y:0,z:8},{x:32,y:0,z:0}];profile.pieces.station.cells[0].high=32;
 const e=new Engine(options,profile),{id}=operatingPark(e);apply(e,{type:'set-ride-status',ride:id,status:'testing'});assert(e.advance(60).ok);
 const train=e.snapshot().trains[0];assert(Number.isFinite(train.stats.maxVerticalG));assert(Number.isFinite(train.stats.maxLateralG));assert(e.restoreSave(e.exportSave()).ok);
});
test('completed travel cannot lose its lap count or disagree with its copied completed measurement',()=>{
 const e=create(),{id}=operatingPark(e);apply(e,{type:'set-ride-status',ride:id,status:'testing'});e.advance(460);assert.equal(e.snapshot().trains[0].phase,'unloading');const before=e.exportSave();
 for(const mutate of [t=>{t.laps=0;t.measured=null;},t=>t.measured.maxSpeed++]){const s=e.snapshot();mutate(s.trains[0]);assert.equal(e.restoreSave(JSON.stringify(s)).ok,false);assert.equal(e.exportSave(),before);}
});
