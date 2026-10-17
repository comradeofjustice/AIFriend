import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
const connections=new Map<string,DatabaseSync>();
export function openDatabase(path:string){
 let db=connections.get(path);if(db)return db;
 mkdirSync(dirname(path),{recursive:true,mode:0o700});db=new DatabaseSync(path);chmodSync(path,0o600);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS auth_users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_codes(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_sessions(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_limits(id TEXT PRIMARY KEY,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS user_records(user_id TEXT NOT NULL,collection TEXT NOT NULL,id INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(user_id,collection,id));
 CREATE TABLE IF NOT EXISTS user_sequences(user_id TEXT NOT NULL,collection TEXT NOT NULL,last_id INTEGER NOT NULL,PRIMARY KEY(user_id,collection));
 CREATE TABLE IF NOT EXISTS user_values(user_id TEXT NOT NULL,store TEXT NOT NULL,key TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(user_id,store,key));
 CREATE TABLE IF NOT EXISTS user_migrations(user_id TEXT PRIMARY KEY,completed_at TEXT NOT NULL);`);
 connections.set(path,db);return db;
}
