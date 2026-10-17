import { env } from '$env/dynamic/private';
import nodemailer from 'nodemailer';
import { AuthError, AuthService } from './core';
export { AuthError, AUTH_COOKIE, SESSION_SECONDS } from './core';
let service:AuthService|undefined;
export function mailConfigured(){return Boolean(env.SMTP_HOST&&env.SMTP_USER&&env.SMTP_PASSWORD&&env.SMTP_FROM);}
export function getAuth(){
 if(service)return service;
 if(!env.AUTH_SECRET||!env.AUTH_DATA_DIR)throw new AuthError(503,'账号服务尚未配置完成。');
 service=new AuthService({directory:env.AUTH_DATA_DIR,secret:env.AUTH_SECRET,deliver:async(email,code)=>{
  if(!mailConfigured())throw new AuthError(503,'邮件服务尚未配置，请联系管理员设置 SMTP 发信邮箱。');
  const port=Number(env.SMTP_PORT||465);const secure=env.SMTP_SECURE?env.SMTP_SECURE==='true':port===465;
  const transport=nodemailer.createTransport({host:env.SMTP_HOST,port,secure,requireTLS:!secure,auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:20000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
  try{await transport.sendMail({from:env.SMTP_FROM,to:email,subject:'纸间 · 注册验证码',text:`你的注册验证码是：${code}\n\n验证码 10 分钟内有效。请勿将验证码告诉他人。如果不是你本人操作，请忽略此邮件。`});}
  catch{throw new AuthError(502,'验证码邮件暂时发送失败，请稍后重试或联系管理员。');}
  finally{transport.close();}
 }});return service;
}
