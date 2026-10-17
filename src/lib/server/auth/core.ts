import { normalizeVerificationCode } from '../../utils/verification-code';
import { randomBytes, randomInt, randomUUID, createHash, createHmac, timingSafeEqual, scrypt } from 'node:crypto';
import { openDatabase } from '../database/sqlite';
import { join } from 'node:path';
interface User { id: string; email: string; salt: string; passwordHash: string; verifiedAt: number; }
interface Code { digest: string; nonce: string; expiresAt: number; sentAt: number; attempts: number; }
interface State { users: User[]; codes: Record<string,Code>; sessions: Record<string,{ userId: string; expiresAt: number }>; limits: Record<string,{ count: number; expiresAt: number }>; }
export interface AuthIdentity { id: string; email: string; }
export class AuthError extends Error { constructor(public status: number, message: string){super(message);} }
export const AUTH_COOKIE = 'utsuwa_session';
export const SESSION_SECONDS = 7 * 86400;
export function normalizeEmail(value: unknown): string {
 if(typeof value!=='string'||value.length>254)throw new AuthError(400,'请输入有效的邮箱地址。');
 const email=value.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AuthError(400,'请输入有效的邮箱地址。');return email;
}
function validatePassword(value: unknown): asserts value is string { if(typeof value!=='string'||value.length<8||value.length>128)throw new AuthError(400,'密码需要 8–128 个字符。'); }
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const derive=(password:string,salt:string)=>new Promise<string>((resolve,reject)=>scrypt(password,salt,64,{N:16384,r:8,p:1},(error,result)=>error?reject(error):resolve(result.toString('hex'))));
function equal(a:string,b:string){const x=Buffer.from(a,'hex'),y=Buffer.from(b,'hex');return x.length===y.length&&timingSafeEqual(x,y);}
export class AuthService {
 private tail:Promise<unknown>=Promise.resolve();
 constructor(private options:{ directory:string; secret:string; deliver:(email:string,code:string)=>Promise<void>; now?:()=>number }){
  if(options.secret.length<32)throw new AuthError(503,'账号服务尚未配置完成。');
 }
 private time(){return this.options.now?.()??Date.now();}
 private codeDigest(email:string,nonce:string,code:string){return createHmac('sha256',this.options.secret).update(`${email}\0${nonce}\0${code}`).digest('hex');}
 private async transaction<T>(work:(state:State)=>Promise<T>|T):Promise<T>{
  const run=this.tail.then(async()=>{
   const db=openDatabase(join(this.options.directory,'utsuwa.sqlite'));
   const state:State={users:[],codes:{},sessions:{},limits:{}};
   state.users=db.prepare('SELECT payload FROM auth_users').all().map(row=>JSON.parse(row.payload as string));
   for(const name of ['codes','sessions','limits'] as const){
    for(const row of db.prepare('SELECT id,payload FROM auth_'+name).all())(state[name] as Record<string,unknown>)[row.id as string]=JSON.parse(row.payload as string);
   }
   const now=this.time();
   for(const [key,item] of Object.entries(state.sessions))if(item.expiresAt<now)delete state.sessions[key];
   for(const [key,item] of Object.entries(state.codes))if(item.expiresAt<now)delete state.codes[key];
   for(const [key,item] of Object.entries(state.limits))if(item.expiresAt<now)delete state.limits[key];
   try{return await work(state);}finally{
    db.exec('BEGIN IMMEDIATE');
    try{
     db.exec('DELETE FROM auth_users; DELETE FROM auth_codes; DELETE FROM auth_sessions; DELETE FROM auth_limits;');
     const insertUser=db.prepare('INSERT INTO auth_users(id,email,payload) VALUES(?,?,?)');
     for(const user of state.users)insertUser.run(user.id,user.email,JSON.stringify(user));
     for(const name of ['codes','sessions','limits'] as const){const insert=db.prepare('INSERT INTO auth_'+name+'(id,payload) VALUES(?,?)');for(const [id,value] of Object.entries(state[name]))insert.run(id,JSON.stringify(value));}
     db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}

   }
  });this.tail=run.catch(()=>{});return run;
 }
 private limit(state:State,key:string,max:number,seconds:number){
  const current=state.limits[key]??{count:0,expiresAt:this.time()+seconds*1000};
  current.count++;state.limits[key]=current;if(current.count>max)throw new AuthError(429,'操作太频繁，请稍后再试。');
 }
 async sendCode(rawEmail:unknown,ip:string){
  const email=normalizeEmail(rawEmail);
  return this.transaction(async state=>{
   this.limit(state,'send-ip:'+digest(ip),20,3600);this.limit(state,'send-email:'+digest(email),10,86400);
   if(state.codes[email]&&this.time()-state.codes[email].sentAt<60000)throw new AuthError(429,'请等待 60 秒后再获取验证码。');
   const code=String(randomInt(0,1000000)).padStart(6,'0'),nonce=randomBytes(16).toString('hex');
   const item={digest:this.codeDigest(email,nonce,code),nonce,expiresAt:this.time()+600000,sentAt:this.time(),attempts:0};
   state.codes[email]=item;
   try{await this.options.deliver(email,code);}catch(error){delete state.codes[email];throw error;}
   return {sent:true,retryAfter:60,expiresIn:600};
  });
 }
 private makeSession(state:State,user:User){const token=randomBytes(32).toString('hex');state.sessions[digest(token)]={userId:user.id,expiresAt:this.time()+SESSION_SECONDS*1000};return {user:{id:user.id,email:user.email},token};}
 async register(rawEmail:unknown,password:unknown,code:unknown,ip:string){
  code=normalizeVerificationCode(code);
  const email=normalizeEmail(rawEmail);validatePassword(password);
  return this.transaction(async state=>{
   this.limit(state,'register-ip:'+digest(ip),30,3600);
   const item=state.codes[email];if(!item||item.expiresAt<this.time())throw new AuthError(400,'请先获取有效的邮箱验证码。');
   item.attempts++;
   if(item.attempts>5){delete state.codes[email];throw new AuthError(429,'验证码尝试次数过多，请重新获取。');}
   if(typeof code!=='string'||!/^\d{6}$/.test(code)||!equal(item.digest,this.codeDigest(email,item.nonce,code)))throw new AuthError(400,'验证码不正确，请检查邮件。');
   if(state.users.some(user=>user.email===email))throw new AuthError(409,'此邮箱已经注册，请直接登录。');
   const salt=randomBytes(16).toString('hex');const user={id:randomUUID(),email,salt,passwordHash:await derive(password,salt),verifiedAt:this.time()};
   state.users.push(user);delete state.codes[email];return this.makeSession(state,user);
  });
 }
 async login(rawEmail:unknown,password:unknown,ip:string){
  const email=normalizeEmail(rawEmail);validatePassword(password);
  return this.transaction(async state=>{
   this.limit(state,'login-ip:'+digest(ip),40,900);this.limit(state,'login-email:'+digest(email),20,900);
   const user=state.users.find(item=>item.email===email);
   const candidate=await derive(password,user?.salt??digest(email));
   if(!user||!equal(candidate,user.passwordHash))throw new AuthError(401,'邮箱或密码不正确。旧本机账号需要先验证邮箱完成注册。');
   return this.makeSession(state,user);
  });
 }
 async identity(token:string|undefined):Promise<AuthIdentity|null>{if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return this.transaction(state=>{const session=state.sessions[digest(token)];if(!session)return null;const user=state.users.find(u=>u.id===session.userId);return user?{id:user.id,email:user.email}:null;});}
 async logout(token:string|undefined){if(token)await this.transaction(state=>{delete state.sessions[digest(token)];});}
}
