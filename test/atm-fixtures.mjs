import assert from 'node:assert/strict';

// Synthetic scaffolding for existing v6-v14 adapter tests, never genuine v15 evidence.
export function beforeAtmState(state){
 const old=structuredClone(state);
 if(old.version===17){
  assert.equal(old.contentVersion,10);
  assert(old.rides.every(r=>r.content.variantId!=='independent.wooden-rise-return-train'),'Synthetic historical state cannot contain v2 rides.');
  const rules=JSON.parse(old.rules);
  assert(!Object.hasOwn(rules.rideProfiles??{},'independent.wooden-rise-return-v2'),'Synthetic historical Rules cannot erase a v2 profile.');
  old.version=16;old.contentVersion=9;
 }
 if(old.version!==16)return old;
 assert.equal(old.contentVersion,9);assert.equal(old.retiredAtmWithdrawals,0);assert.equal(old.people.departedWithdrawn,0);
 assert(old.facilities.every(f=>f.kind!=='atm'));
 for(const g of old.people.guests){assert.equal(g.withdrawn,0);assert.equal(g.atmRefusal,null);assert.notEqual(g.phase,'withdrawing');delete g.withdrawn;delete g.atmRefusal;}
 delete old.retiredAtmWithdrawals;delete old.people.departedWithdrawn;
 const rules=JSON.parse(old.rules);delete rules.atmProfiles;delete rules.facilityProfiles['independent.atm-v1'];
 old.rules=JSON.stringify(rules);old.version=15;old.contentVersion=8;return old;
}

export function beforeAtmView(view){
 const old=structuredClone(view);
 if(old.protocolVersion===10){
  assert.equal(old.contentVersion,10);
  assert(old.rides.every(r=>r.content.variantId!=='independent.wooden-rise-return-train'&&r.trackProfile?.vehicle.kind!=='coupled-unbanked'),'Synthetic historical view cannot contain v2 rides.');
  assert(!old.rides.some(r=>r.trackProfile?.pieces?.['lift-start']&&r.presentation?.kind==='detailed-wooden-coaster'),'Synthetic historical view cannot contain v2 track profiles.');
  old.protocolVersion=9;old.contentVersion=9;
 }
 if(old.protocolVersion!==9)return old;
 assert.equal(old.contentVersion,9);assert(old.facilities.every(f=>f.kind!=='atm'));
 old.protocolVersion=8;old.contentVersion=8;return old;
}
