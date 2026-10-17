import { createHash } from 'node:crypto';
import { decodeWire } from '../../db/wire';
import { mergeCharacterStates } from '../../services/storage/character-merge';
import type { CharacterState } from '../../types/character';
import { openDatabase } from './sqlite';
import { join } from 'node:path';
export const COLLECTIONS=['characterStates','facts','sessions','conversationTurns','completedEvents','reminders'] as const;
const STORES=['preferences','utsuwa-vrm','utsuwa-keepsakes','utsuwa-backgrounds','utsuwa-animations'];
export class StorageError extends Error{constructor(public status:number,message:string){super(message);}}
export class UserStorage{
 private db;
 constructor(directory:string){this.db=openDatabase(join(directory,'utsuwa.sqlite'));}
 preferences(user:string){return Object.fromEntries(this.db.prepare("SELECT key,payload FROM user_values WHERE user_id=? AND store='preferences'").all(user).map(r=>[r.key,JSON.parse(r.payload as string)]));}
 private transaction<T>(work:()=>T){this.db.exec('BEGIN IMMEDIATE');try{const result=work();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 run(user:string,body:any):any{
  if(!body||typeof body!=='object')throw new StorageError(400,'请求格式不正确。');
  const {op,collection,store,key}=body;
  if(op==='clearAll')return this.transaction(()=>{for(const table of ['user_records','user_values','user_sequences'])this.db.prepare('DELETE FROM '+table+' WHERE user_id=?').run(user);return true;});
  if(op==='preferences')return this.preferences(user);
  if(op==='snapshot'||op==='commitSnapshot')return this.transaction(()=>{
   const rows=this.db.prepare('SELECT collection,id,payload FROM user_records WHERE user_id=? ORDER BY collection,id').all(user);
   const revision=createHash('sha256').update(JSON.stringify(rows)).digest('hex');
   if(op==='snapshot')return {revision,records:Object.fromEntries(COLLECTIONS.map(name=>[name,rows.filter(r=>r.collection===name).map(r=>JSON.parse(r.payload as string))])),sequences:Object.fromEntries(this.db.prepare('SELECT collection,last_id FROM user_sequences WHERE user_id=?').all(user).map(r=>[r.collection,r.last_id]))};
   if(body.revision!==revision)throw new StorageError(409,'数据已在其他页面更新，原有数据未被覆盖，请重新导入。');
   for(const name of COLLECTIONS){
    const records=body.records?.[name];if(!Array.isArray(records))throw new StorageError(400,'导入数据格式不正确。');
    this.db.prepare('DELETE FROM user_records WHERE user_id=? AND collection=?').run(user,name);
    let next=0;
    for(const record of records){if(!Number.isSafeInteger(record.id)||record.id<1)throw new StorageError(400,'导入记录编号不正确。');this.db.prepare('INSERT INTO user_records VALUES(?,?,?,?)').run(user,name,record.id,JSON.stringify(record));next=Math.max(next,record.id);}
    this.db.prepare('INSERT INTO user_sequences VALUES(?,?,?) ON CONFLICT(user_id,collection) DO UPDATE SET last_id=MAX(last_id,excluded.last_id)').run(user,name,Math.max(next,Number(body.sequences?.[name])||0));
   }
   return true;
  });

  if(op==='migrate')return this.transaction(()=>{
   if(this.db.prepare('SELECT user_id FROM user_migrations WHERE user_id=?').get(user))return {alreadyMigrated:true};
   const sessionIds=new Map<number,number>();let count=0;
   for(const collection of ['characterStates','facts','sessions','conversationTurns','completedEvents','reminders']){
    const incoming=body.records?.[collection]??[];if(!Array.isArray(incoming))throw new StorageError(400,'旧存档格式不正确。');
    const existing=this.db.prepare('SELECT id,payload FROM user_records WHERE user_id=? AND collection=?').all(user,collection);
    const fingerprint=(record:any)=>JSON.stringify(Object.fromEntries(Object.entries(record).filter(([key])=>key!=='id').sort(([a],[b])=>a.localeCompare(b))));
    const known=new Map(existing.map(row=>[fingerprint(JSON.parse(row.payload as string)),Number(row.id)]));
    let next=Number(this.db.prepare('SELECT MAX(id) AS last FROM user_records WHERE user_id=? AND collection=?').get(user,collection)?.last??0);
    for(const source of incoming){
     if(collection==='characterStates'&&existing.length)continue;
     const record={...source};delete record.id;
     if(collection==='conversationTurns'&&record.sessionId)record.sessionId=sessionIds.get(record.sessionId)??record.sessionId;
     const key=fingerprint(record);let id=known.get(key);
     if(!id){id=collection==='characterStates'?1:++next;this.db.prepare('INSERT INTO user_records VALUES(?,?,?,?)').run(user,collection,id,JSON.stringify({...record,id}));known.set(key,id);count++;}
     if(collection==='sessions')sessionIds.set(source.id,id);
    }
    this.db.prepare('INSERT INTO user_sequences VALUES(?,?,?) ON CONFLICT(user_id,collection) DO UPDATE SET last_id=MAX(last_id,excluded.last_id)').run(user,collection,next);
   }
   for(const [key,value] of Object.entries(body.preferences??{})){
    if(key.length>300||typeof value!=='string')throw new StorageError(400,'旧设置格式不正确。');
    this.db.prepare("INSERT OR IGNORE INTO user_values VALUES(?,'preferences',?,?)").run(user,key,JSON.stringify(value));
   }
   for(const asset of body.assets??[]){
    if(!STORES.includes(asset.store)||asset.store==='preferences'||typeof asset.key!=='string')throw new StorageError(400,'旧素材格式不正确。');
    const previous=this.db.prepare('SELECT payload FROM user_values WHERE user_id=? AND store=? AND key=?').get(user,asset.store,asset.key);
    let value=asset.value;
    if(previous){const old=JSON.parse(previous.payload as string);if(Array.isArray(old)&&Array.isArray(value))value=[...old,...value.filter((v:any)=>!old.some((p:any)=>p.id===v.id))];else continue;}
    this.db.prepare('INSERT INTO user_values VALUES(?,?,?,?) ON CONFLICT(user_id,store,key) DO UPDATE SET payload=excluded.payload').run(user,asset.store,asset.key,JSON.stringify(value));
   }
   this.db.prepare('INSERT INTO user_migrations VALUES(?,?)').run(user,new Date().toISOString());return {imported:count};
  });

  if(op==='characterSave')return this.transaction(()=>{
   const old=this.db.prepare("SELECT payload FROM user_records WHERE user_id=? AND collection='characterStates' AND id=1").get(user);
   const incoming=decodeWire(body.value) as CharacterState;
   const merged=old?mergeCharacterStates(decodeWire(JSON.parse(old.payload as string)) as CharacterState,incoming):incoming;
   const encodeDates=(value:any):any=>value instanceof Date?{__utsuwa_type:'date',value:value.toISOString()}:Array.isArray(value)?value.map(encodeDates):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encodeDates(v)])):value;
   const value=encodeDates({...merged,id:1,updatedAt:new Date()});
   this.db.prepare("INSERT INTO user_records VALUES(?,'characterStates',1,?) ON CONFLICT(user_id,collection,id) DO UPDATE SET payload=excluded.payload").run(user,JSON.stringify(value));return 1;
  });

  if(op==='kvGet'||op==='kvSet'||op==='kvDelete'||op==='kvClear'||op==='kvKeys'){
   if(!STORES.includes(store)||((op!=='kvClear'&&op!=='kvKeys')&&(typeof key!=='string'||key.length>300)))throw new StorageError(400,'无效的存储项目。');
   if(op==='kvKeys')return this.db.prepare('SELECT key FROM user_values WHERE user_id=? AND store=?').all(user,store).map(row=>row.key);
   if(op==='kvGet'){const row=this.db.prepare('SELECT payload FROM user_values WHERE user_id=? AND store=? AND key=?').get(user,store,key);return row?JSON.parse(row.payload as string):null;}
   if(op==='kvSet'){this.db.prepare('INSERT INTO user_values VALUES(?,?,?,?) ON CONFLICT(user_id,store,key) DO UPDATE SET payload=excluded.payload').run(user,store,key,JSON.stringify(body.value));return true;}
   if(op==='kvDelete'){this.db.prepare('DELETE FROM user_values WHERE user_id=? AND store=? AND key=?').run(user,store,key);return true;}
   this.db.prepare('DELETE FROM user_values WHERE user_id=? AND store=?').run(user,store);return true;
  }
  if(!COLLECTIONS.includes(collection))throw new StorageError(400,'无效的数据集合。');
  const read=(id:number)=>this.db.prepare('SELECT payload FROM user_records WHERE user_id=? AND collection=? AND id=?').get(user,collection,id);
  const put=(id:number,value:any)=>this.db.prepare('INSERT INTO user_records VALUES(?,?,?,?) ON CONFLICT(user_id,collection,id) DO UPDATE SET payload=excluded.payload').run(user,collection,id,JSON.stringify({...value,id}));
  if(op==='list')return this.db.prepare('SELECT payload FROM user_records WHERE user_id=? AND collection=? ORDER BY id').all(user,collection).map(r=>JSON.parse(r.payload as string));
  if(op==='get'){const row=read(Number(body.id));return row?JSON.parse(row.payload as string):null;}
  if(op==='clear'){this.db.prepare('DELETE FROM user_records WHERE user_id=? AND collection=?').run(user,collection);return true;}
  if(op==='delete'){this.db.prepare('DELETE FROM user_records WHERE user_id=? AND collection=? AND id=?').run(user,collection,Number(body.id));return true;}
  if(op==='add'||op==='put')return this.transaction(()=>{
   let id=Number(body.value?.id);
   if(!Number.isSafeInteger(id)||id<1){this.db.prepare('INSERT INTO user_sequences VALUES(?,?,1) ON CONFLICT(user_id,collection) DO UPDATE SET last_id=last_id+1').run(user,collection);id=Number(this.db.prepare('SELECT last_id FROM user_sequences WHERE user_id=? AND collection=?').get(user,collection)!.last_id);}
   else this.db.prepare('INSERT INTO user_sequences VALUES(?,?,?) ON CONFLICT(user_id,collection) DO UPDATE SET last_id=MAX(last_id,excluded.last_id)').run(user,collection,id);
   if(op==='add'&&read(id))throw new StorageError(409,'记录已存在。');
   if(collection==='characterStates')id=1;
   put(id,body.value);return id;
  });
  if(op==='update')return this.transaction(()=>{const row=read(Number(body.id));if(!row)return 0;put(Number(body.id),{...JSON.parse(row.payload as string),...body.value});return 1;});
  if(op==='modify')return this.transaction(()=>{let count=0;for(const item of body.items??[]){const row=read(Number(item.id));if(row&&JSON.stringify(JSON.parse(row.payload as string))===JSON.stringify(item.expected)){put(Number(item.id),{...item.expected,...body.value});count++;}}return count;});
  throw new StorageError(400,'无效的数据操作。');
 }
}
