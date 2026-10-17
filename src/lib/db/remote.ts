import { cloudRequest,changed } from './cloud-client';
const compare=(a:any,b:any):number=>Array.isArray(a)?a.reduce((n,v,i)=>n||compare(v,b[i]),0):(a instanceof Date?a.getTime():a)<(b instanceof Date?b.getTime():b)?-1:(a instanceof Date?a.getTime():a)>(b instanceof Date?b.getTime():b)?1:0;
class Query{
 private predicates:((row:any)=>boolean)[]=[];private field='id';private descending=false;private max=Infinity;
 constructor(private table:RemoteTable){}
 where(field:string){this.field=field;return this;}
 private value(row:any){return this.field.startsWith('[')?this.field.slice(1,-1).split('+').map(k=>row[k]):row[this.field];}
 equals(value:any){this.predicates.push(row=>compare(this.value(row),value)===0);return this;}
 between(low:any,high:any,includeLow=true,includeHigh=false){this.predicates.push(row=>{const value=this.value(row);return (includeLow?compare(value,low)>=0:compare(value,low)>0)&&(includeHigh?compare(value,high)<=0:compare(value,high)<0);});return this;}
 and(predicate:(row:any)=>boolean){this.predicates.push(predicate);return this;}
 filter(predicate:(row:any)=>boolean){return this.and(predicate);}
 reverse(){this.descending=!this.descending;return this;}
 limit(max:number){this.max=max;return this;}
 async toArray(){return (await this.table.toArray()).filter(row=>this.predicates.every(p=>p(row))).sort((a,b)=>compare(this.value(a),this.value(b))*(this.descending?-1:1)).slice(0,this.max);}
 async first(){return (await this.limit(1).toArray())[0];}
 async count(){return (await this.toArray()).length;}
 async modify(value:unknown){const items=(await this.toArray()).map(row=>({id:row.id,expected:row}));const result=await cloudRequest({op:'modify',collection:this.table.name,items,value});changed();return result;}
}
export class RemoteTable{
 constructor(public name:string){}
 toArray():Promise<any[]>{return cloudRequest({op:'list',collection:this.name});}
 get(id:number):Promise<any>{return cloudRequest({op:'get',collection:this.name,id}).then(x=>x??undefined);}
 async add(value:unknown){const id=await cloudRequest({op:'add',collection:this.name,value});changed();return id;}
 async put(value:unknown){const id=await cloudRequest({op:'put',collection:this.name,value});changed();return id;}
 async update(id:number,value:unknown){const result=await cloudRequest({op:'update',collection:this.name,id,value});changed();return result;}
 async delete(id:number){await cloudRequest({op:'delete',collection:this.name,id});changed();}
 async clear(){await cloudRequest({op:'clear',collection:this.name});changed();}
 toCollection(){return new Query(this);}
 where(field:string){return new Query(this).where(field);}
 orderBy(field:string){return this.where(field);}
 async bulkAdd(values:unknown[]){for(const value of values)await this.add(value);}
}
const tables=['characterStates','facts','sessions','conversationTurns','completedEvents','reminders'].map(name=>new RemoteTable(name));
export const remoteDatabase={...Object.fromEntries(tables.map(table=>[table.name,table])),tables};
export function remoteLiveQuery<T>(query:()=>Promise<T>){return {subscribe(observer:{next:(value:T)=>void;error?:(error:unknown)=>void}){let closed=false,running=false;const refresh=async()=>{if(closed||running)return;running=true;try{const value=await query();if(!closed)observer.next(value);}catch(error){if(!closed)observer.error?.(error);}finally{running=false;}};void refresh();const interval=setInterval(refresh,10000);window.addEventListener('utsuwa-data-change',refresh);return {unsubscribe(){closed=true;clearInterval(interval);window.removeEventListener('utsuwa-data-change',refresh);}};}};}
