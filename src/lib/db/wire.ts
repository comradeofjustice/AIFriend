/** Preserve Dates and binary assets over JSON without browser persistence. */
export async function encodeWire(value:unknown):Promise<any>{
 if(value instanceof Date)return {__utsuwa_type:'date',value:value.toISOString()};
 if(value instanceof Blob){const bytes=new Uint8Array(await value.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return {__utsuwa_type:'blob',type:value.type,value:btoa(binary)};}
 if(value instanceof ArrayBuffer)return encodeWire(new Blob([value]));
 if(ArrayBuffer.isView(value))return Array.from(value as unknown as ArrayLike<number>);
 if(Array.isArray(value))return Promise.all(value.map(encodeWire));
 if(value&&typeof value==='object')return Object.fromEntries(await Promise.all(Object.entries(value).map(async([k,v])=>[k,await encodeWire(v)])));
 return value;
}
export function decodeWire(value:any):any{
 if(!value||typeof value!=='object')return value;
 if(value.__utsuwa_type==='date')return new Date(value.value);
 if(value.__utsuwa_type==='blob'){const binary=atob(value.value);return new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:value.type});}
 if(Array.isArray(value))return value.map(decodeWire);
 return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decodeWire(v)]));
}
