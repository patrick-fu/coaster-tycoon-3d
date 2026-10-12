import assert from 'node:assert/strict';

export function beforeRestroomState(state){
 const old=structuredClone(state);assert.equal(old.version,15);assert.equal(old.contentVersion,8);
 assert(old.people.guests.every(g=>g.phase!=='using-restroom'&&g.phase!=='restroom-exit'));
 assert(old.facilities.every(f=>f.content.variantId!=='independent.gradual-restroom'));
 const rules=JSON.parse(old.rules);assert(Object.hasOwn(rules,'restroomProfiles'));delete rules.restroomProfiles;
 delete rules.facilityProfiles['independent.gradual-restroom-v1'];
 old.rules=JSON.stringify(rules);old.version=14;old.contentVersion=7;return old;
}

export function beforeRestroomView(view){
 const old=structuredClone(view);assert.equal(old.protocolVersion,8);assert.equal(old.contentVersion,8);
 assert(old.facilities.every(f=>!Object.hasOwn(f,'restroom')));
 old.protocolVersion=7;old.contentVersion=7;return old;
}
