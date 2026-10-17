/** Account identity is server verified; nothing is persisted in browser storage. */
export const ACCOUNTS_KEY='companion.local-accounts.v1';
export const SESSION_KEY='companion.local-session.v1';
export interface LocalIdentity{id:string;email:string;storageId:string;emailVerified:true;}
let identity:LocalIdentity|null=typeof window==='undefined'?null:(window as any).__UTSUWA_BOOT__?.user??null;
export function getLocalIdentity(){return identity;}
export function accountStorageName(name:string){return name;}
export function adoptServerIdentity(user:{id:string;email:string}):LocalIdentity{
 identity={...user,storageId:user.id,emailVerified:true};
 if(typeof window!=='undefined'){(window as any).__UTSUWA_BOOT__??={preferences:{}};(window as any).__UTSUWA_BOOT__.user=identity;}
 return identity;
}
async function requestAuth(action:string,body:unknown){const response=await fetch('/api/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'账号服务暂时不可用，请稍后重试。');return data;}
export async function requestEmailCode(email:string){return requestAuth('code',{email});}
export async function enterLocalAccount(email:string,password:string,register=false,code?:string){const data=await requestAuth(register?'register':'login',{email,password,code});return adoptServerIdentity(data.user);}
export async function restoreServerIdentity(){const response=await fetch('/api/auth/me',{cache:'no-store'});if(response.status===401){identity=null;return null;}if(!response.ok)throw new Error('暂时无法确认登录状态，请刷新重试。');const {user}=await response.json();return user?adoptServerIdentity(user):null;}
export async function leaveLocalAccount(){const {userPreferences}=await import('$lib/db/preferences');await userPreferences.flush();await requestAuth('logout',{});identity=null;}
