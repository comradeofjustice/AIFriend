import { encodeWire,decodeWire } from './wire';
export async function cloudRequest(body:unknown):Promise<any>{
 const payload=JSON.stringify(await encodeWire(body));
 let response:Response;
 try{response=await fetch('/api/storage',{method:'POST',headers:{'Content-Type':'application/json','X-Utsuwa-Account':typeof window==='undefined'?'':((window as any).__UTSUWA_BOOT__?.user?.id??'')},body:payload,keepalive:payload.length<15000});}catch(error){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('utsuwa-save-error',{detail:'无法连接服务器，数据尚未保存。请检查网络，暂时不要关闭页面。'}));throw error;}
 const data=await response.json().catch(()=>({}));
 if(!response.ok){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('utsuwa-save-error',{detail:data.error||'服务器保存失败，请检查网络。'}));throw new Error(data.error||'服务器保存失败，请检查网络。');}
 return decodeWire(data.result);
}
export function changed(){if(typeof window!=='undefined')window.dispatchEvent(new Event('utsuwa-data-change'));}
