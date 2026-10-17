import { cloudRequest } from './cloud-client';
let memory:Record<string,string>=typeof window==='undefined'?{}:((window as any).__UTSUWA_BOOT__?.preferences??{});
let queue:Promise<unknown>=Promise.resolve();
let failed:unknown=null;
function save(body:unknown){queue=queue.then(()=>cloudRequest(body)).catch(error=>{failed=error;});}
export const userPreferences={
 getItem(key:string){return memory[key]??null;},
 setItem(key:string,value:string){memory[key]=String(value);if(typeof window!=='undefined'&&(window as any).__UTSUWA_BOOT__?.user)save({op:'kvSet',store:'preferences',key,value:String(value)});},
 removeItem(key:string){delete memory[key];if(typeof window!=='undefined'&&(window as any).__UTSUWA_BOOT__?.user)save({op:'kvDelete',store:'preferences',key});},
 keys(){return Object.keys(memory);},
 async flush(){await queue;if(failed){const error=failed;failed=null;throw error;}}
};
