import assert from 'node:assert/strict';
globalThis.window={__UTSUWA_BOOT__:{user:null,preferences:{}}};
Object.defineProperty(globalThis,'localStorage',{get(){throw new Error('Account code must never access browser persistence');}});
const accounts=await import('../../src/lib/services/accounts/local-accounts.ts');
assert.equal(accounts.getLocalIdentity(),null);
let fail=false;
globalThis.fetch=async(url)=>{
 if(fail)return new Response(JSON.stringify({error:'verification rejected'}),{status:400});
 return new Response(JSON.stringify(url.endsWith('logout')?{ok:true}:{user:{id:'server-account-1',email:'owner@example.test'}}),{status:200});
};
const user=await accounts.enterLocalAccount('owner@example.test','sample-test-password',true,'123456');
assert.equal(user.id,'server-account-1');assert.equal(accounts.getLocalIdentity().emailVerified,true);
assert.equal(accounts.accountStorageName('utsuwa-db'),'utsuwa-db');
fail=true;await assert.rejects(accounts.enterLocalAccount('other@example.test','sample-test-password',true,'123456'));assert.equal(accounts.getLocalIdentity().id,'server-account-1');
fail=false;await accounts.leaveLocalAccount();assert.equal(accounts.getLocalIdentity(),null);
console.log('PASS: server identity lifecycle and rejected registration without any browser credential persistence.');
