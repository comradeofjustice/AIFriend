/** The only code allowed to READ legacy browser persistence, then remove it after a committed migration. */
import { cloudRequest } from './cloud-client';
import Dexie from 'dexie';
import localforage from 'localforage';
export async function migrateBrowserData(email:string){
 const saved=JSON.parse(window.localStorage.getItem('companion.local-accounts.v1')||'[]');
 const account=Array.isArray(saved)?saved.find((a:any)=>a.email?.toLowerCase()===email.toLowerCase()):null;
 if(!account)return {found:false};
 const suffix=account.storageId?`--${account.storageId}`:'';
 const databases=await indexedDB.databases();const names=new Set(databases.map(d=>d.name));
 const records:Record<string,unknown[]>={};const legacyName='utsuwa-db'+suffix;
 if(names.has(legacyName)){
  const legacy=new Dexie(legacyName);await legacy.open();
  try{for(const name of ['characterStates','facts','sessions','conversationTurns','completedEvents','reminders']){if(legacy.tables.some(t=>t.name===name))records[name]=await legacy.table(name).toArray();}}
  finally{legacy.close();}
 }
 const preferences:Record<string,string>={},keys:string[]=[];
 for(let i=0;i<window.localStorage.length;i++){
  const key=window.localStorage.key(i)!;if((key.startsWith('utsuwa-')&&(suffix?(key.endsWith(suffix)||key.startsWith('utsuwa-module-'+suffix)):!key.includes('--')))||key==='colorMode'){
   const value=window.localStorage.getItem(key);if(value!==null){const normalized=suffix&&key.startsWith('utsuwa-module-'+suffix)?key.replace('utsuwa-module-'+suffix,'utsuwa-module-'):suffix&&key.endsWith(suffix)?key.slice(0,-suffix.length):key;preferences[normalized]=value;keys.push(key);}
  }
 }
 const stores=[['utsuwa-vrm','models'],['utsuwa-keepsakes','images'],['utsuwa-backgrounds','images'],['utsuwa-animations','files']];
 const assets:unknown[]=[];
 for(const [base,storeName] of stores){if(!names.has(base+suffix))continue;const store=localforage.createInstance({name:base+suffix,storeName});for(const key of await store.keys())assets.push({store:base,key,value:await store.getItem(key)});}
 const result=await cloudRequest({op:'migrate',records,preferences,assets});
 // A committed migration is required before removing any source data.
 if(!result.alreadyMigrated){
  if(names.has(legacyName))await Dexie.delete(legacyName);
  for(const [base] of stores)if(names.has(base+suffix))await Dexie.delete(base+suffix);
  for(const key of keys)window.localStorage.removeItem(key);
  const remaining=saved.filter((a:any)=>a!==account);
  if(remaining.length)window.localStorage.setItem('companion.local-accounts.v1',JSON.stringify(remaining));else window.localStorage.removeItem('companion.local-accounts.v1');
  window.localStorage.removeItem('companion.local-session.v1');
 }
 return {found:true,...result};
}
