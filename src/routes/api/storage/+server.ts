import { json } from '@sveltejs/kit';
import { getAuth, AUTH_COOKIE } from '$lib/server/auth';
import { getUserStorage } from '$lib/server/database';
import { StorageError } from '$lib/server/database/storage';
import type { RequestHandler } from './$types';
export const POST:RequestHandler=async({request,cookies})=>{
 try{
  const user=await getAuth().identity(cookies.get(AUTH_COOKIE));
  if(!user)return json({error:'请先登录。'},{status:401});
  if(request.headers.get('X-Utsuwa-Account')!==user.id)return json({error:'登录账号已变化，请刷新页面后继续。'},{status:409});
  const result=getUserStorage().run(user.id,await request.json());
  return json({result},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return json({error:error instanceof StorageError?error.message:'数据库操作失败，请稍后重试。'},{status:error instanceof StorageError?error.status:500});}
};
