import assert from 'node:assert/strict';

export function beforeMerchandiseGuest(guest) {
 const old=structuredClone(guest);
 assert.deepEqual(old.merchandise,{map:false,umbrellaColour:null});
 assert.equal(old.informationCounter,null);
 delete old.merchandise;delete old.informationCounter;return old;
}

export function beforeMerchandiseState(state) {
 const old=structuredClone(state);
 assert.equal(old.version,14);assert.equal(old.contentVersion,7);
 assert.deepEqual(old.retiredMerchandise,{'independent.map':{sales:0,income:0},'independent.umbrella':{sales:0,income:0}});
 delete old.retiredMerchandise;
 old.people.guests=old.people.guests.map(beforeMerchandiseGuest);
 for(const f of old.facilities)assert.notEqual(f.kind,'information');
 const rules=JSON.parse(old.rules);assert(Object.hasOwn(rules,'merchandiseProfiles'));delete rules.merchandiseProfiles;
 if(Object.hasOwn(rules.facilityProfiles,'independent.information-kiosk-v1')){
  assert.deepEqual(rules.facilityProfiles['independent.information-kiosk-v1'],{height:32});
  delete rules.facilityProfiles['independent.information-kiosk-v1'];
 }
 old.rules=JSON.stringify(rules);old.version=13;old.contentVersion=6;return old;
}

export function beforeMerchandiseView(view) {
 const old=structuredClone(view);assert.equal(old.protocolVersion,7);assert.equal(old.contentVersion,7);
 for(const f of old.facilities)assert.notEqual(f.kind,'information');
 old.protocolVersion=6;old.contentVersion=6;return old;
}
