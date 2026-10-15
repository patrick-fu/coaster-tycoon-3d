import assert from 'node:assert/strict';

// Synthetic scaffolding for existing v6-v14 adapter tests, never genuine v15 evidence.
export function beforeAtmState(state){
 const old=structuredClone(state);if(old.version!==16)return old;
 assert.equal(old.contentVersion,9);assert.equal(old.retiredAtmWithdrawals,0);assert.equal(old.people.departedWithdrawn,0);
 assert(old.facilities.every(f=>f.kind!=='atm'));
 for(const g of old.people.guests){assert.equal(g.withdrawn,0);assert.equal(g.atmRefusal,null);assert.notEqual(g.phase,'withdrawing');delete g.withdrawn;delete g.atmRefusal;}
 delete old.retiredAtmWithdrawals;delete old.people.departedWithdrawn;
 const rules=JSON.parse(old.rules);delete rules.atmProfiles;delete rules.facilityProfiles['independent.atm-v1'];
 old.rules=JSON.stringify(rules);old.version=15;old.contentVersion=8;return old;
}

export function beforeAtmView(view){
 const old=structuredClone(view);if(old.protocolVersion!==9)return old;
 assert.equal(old.contentVersion,9);assert(old.facilities.every(f=>f.kind!=='atm'));
 old.protocolVersion=8;old.contentVersion=8;return old;
}
