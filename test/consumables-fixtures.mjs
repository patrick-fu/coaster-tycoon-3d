import assert from 'node:assert/strict';

export function beforeCommerceState(state){
 const old=structuredClone(state);assert.equal(old.version,13);assert.equal(old.contentVersion,6);
 const rules=JSON.parse(old.rules);assert(Object.hasOwn(rules,'facilityProfiles'));assert([JSON.stringify({}),JSON.stringify({'independent.detailed-stalls-v1':{height:32}})].includes(JSON.stringify(rules.facilityProfiles)));delete rules.facilityProfiles;assert(Object.hasOwn(rules,'commerceProfiles'));delete rules.commerceProfiles;old.rules=JSON.stringify(rules);
 for(const g of old.people.guests){assert.equal(g.held,null);delete g.held;}
 for(const f of old.facilities)assert(['independent.food-stand','independent.drink-stand','independent.restroom'].includes(f.content.variantId));
 for(const l of old.litter)assert(!Object.hasOwn(l,'containerId'));
 old.version=11;old.contentVersion=4;return old;
}

export function beforeCommerceView(view){
 const old=structuredClone(view);assert.equal(old.protocolVersion,6);assert.equal(old.contentVersion,6);
 assert(Array.isArray(old.products));assert.deepEqual(old.litterTypes,[]);delete old.products;delete old.litterTypes;
 for(const f of old.facilities){assert.equal(f.product,null);assert.equal(f.priceBounds.min,0);assert(Number.isSafeInteger(f.priceBounds.max));delete f.product;delete f.priceBounds;}
 old.protocolVersion=4;old.contentVersion=4;return old;
}
