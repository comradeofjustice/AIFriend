import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UserStorage } from '../../src/lib/server/database/storage.ts';
import { openDatabase } from '../../src/lib/server/database/sqlite.ts';
import { remoteDatabase as db } from '../../src/lib/db/remote.ts';
const directory=await mkdtemp(join(tmpdir(),'utsuwa-client-test-'));const storage=new UserStorage(directory);
globalThis.window={dispatchEvent(){}};
globalThis.fetch=async(url,options)=>new Response(JSON.stringify({result:storage.run('owner',JSON.parse(options.body))}),{status:200,headers:{'Content-Type':'application/json'}});
try{
 await db.facts.add({content:'minor',category:'likes',importance:1});await db.facts.add({content:'major',category:'likes',importance:9});
 assert.equal((await db.facts.orderBy('importance').reverse().limit(1).toArray())[0].content,'major');
 assert.equal((await db.facts.where('category').equals('likes').toArray()).length,2);
 await db.reminders.add({executed:0,triggerAt:new Date(1000)});await db.reminders.add({executed:0,triggerAt:new Date(100000)});
 const due=await db.reminders.where('[executed+triggerAt]').between([0,new Date(0)],[0,new Date(5000)],true,true).toArray();assert.equal(due.length,1);assert.ok(due[0].triggerAt instanceof Date);
 assert.equal(await db.reminders.where('id').equals(due[0].id).and(r=>!r.executed).modify({executed:1}),1);
 assert.equal(await db.reminders.where('id').equals(due[0].id).and(r=>!r.executed).modify({executed:1}),0);
 await db.facts.update(1,{importance:10});assert.equal((await db.facts.get(1)).importance,10);
 await db.facts.delete(1);assert.equal(await db.facts.get(1),undefined);
 console.log('PASS: remote client query compatibility, ordering, compound Date indexes and guarded mutations.');
}finally{openDatabase(join(directory,'utsuwa.sqlite')).close();await rm(directory,{recursive:true,force:true});}
