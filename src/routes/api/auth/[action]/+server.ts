import { json } from '@sveltejs/kit';
import { getAuth, AuthError, AUTH_COOKIE, SESSION_SECONDS, mailConfigured } from '$lib/server/auth';
import type { RequestHandler } from './$types';
const headers={'Cache-Control':'no-store'};
export const GET:RequestHandler=async({params,cookies})=>{
 try{
  if(params.action==='status')return json({mailReady:mailConfigured()}, {headers});
  if(params.action!=='me')return json({error:'接口不存在。'},{status:404,headers});
  const user=await getAuth().identity(cookies.get(AUTH_COOKIE));return json({user},{status:user?200:401,headers});
 }catch(error){return failure(error);}
};
export const POST:RequestHandler=async({params,request,cookies,getClientAddress})=>{
 try{
  const auth=getAuth();
  if(params.action==='logout'){await auth.logout(cookies.get(AUTH_COOKIE));cookies.delete(AUTH_COOKIE,{path:'/'});return json({ok:true},{headers});}
  let body;try{body=await request.json();}catch{throw new AuthError(400,'请求格式不正确。');}
  const ip=getClientAddress();
  if(params.action==='code'){if(!mailConfigured())throw new AuthError(503,'邮件服务尚未配置，请联系管理员设置 SMTP 发信邮箱。');return json(await auth.sendCode(body.email,ip),{headers});}
  if(params.action!=='register'&&params.action!=='login')return json({error:'接口不存在。'},{status:404,headers});
  const result=params.action==='register'?await auth.register(body.email,body.password,body.code,ip):await auth.login(body.email,body.password,ip);
  cookies.set(AUTH_COOKIE,result.token,{path:'/',httpOnly:true,secure:true,sameSite:'lax',maxAge:SESSION_SECONDS});return json({user:result.user},{headers});
 }catch(error){return failure(error);}
};
function failure(error:unknown){return json({error:error instanceof AuthError?error.message:'账号服务暂时不可用，请稍后重试。'},{status:error instanceof AuthError?error.status:500,headers});}
