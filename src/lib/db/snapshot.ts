import { cloudRequest,changed } from './cloud-client';
/** Import transforms run only in RAM; one compare-and-swap commits every table in SQLite. */
export async function createSnapshotTransaction(){
 const snapshot=await cloudRequest({op:'snapshot'});
 class Table{
  constructor(public name:string){}
  async toArray(){return structuredClone(snapshot.records[this.name]);}
  toCollection(){return {first:async()=>structuredClone(snapshot.records[this.name][0])};}
  async clear(){snapshot.records[this.name]=[];}
  async add(value:any){const id=value.id??((snapshot.sequences[this.name]??0)+1);snapshot.sequences[this.name]=Math.max(snapshot.sequences[this.name]??0,id);snapshot.records[this.name].push(structuredClone({...value,id}));return id;}
 }
 const tables=Object.keys(snapshot.records).map(name=>new Table(name));
 const database={...Object.fromEntries(tables.map(table=>[table.name,table])),tables,transaction:async(...args:any[])=>args.at(-1)()};
 return {database,async commit(){await cloudRequest({op:'commitSnapshot',...snapshot});changed();}};
}
