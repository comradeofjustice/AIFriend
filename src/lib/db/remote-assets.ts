import { cloudRequest } from './cloud-client';
export function createInstance(options:{name:string;storeName?:string}){
 const store=options.name.split('--')[0];
 return {
  getItem:<T>(key:string):Promise<T|null>=>typeof window==='undefined'||!(window as any).__UTSUWA_BOOT__?.user?Promise.resolve(null):cloudRequest({op:'kvGet',store,key}),
  async setItem<T>(key:string,value:T):Promise<T>{await cloudRequest({op:'kvSet',store,key,value});return value;},
  async removeItem(key:string){await cloudRequest({op:'kvDelete',store,key});},
  keys:():Promise<string[]>=>cloudRequest({op:'kvKeys',store}),
  async clear(){await cloudRequest({op:'kvClear',store});}
 };
}
export default {createInstance};
