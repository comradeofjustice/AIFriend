import assert from 'node:assert/strict';
import { readFile,writeFile,unlink } from 'node:fs/promises';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { normalizeVerificationCode } from '../../src/lib/utils/verification-code.ts';
const source=await readFile(new URL('../../src/routes/login/+page.svelte',import.meta.url),'utf8');
const input=source.match(/<input id="email-code"[^>]*(?:=>[^>]*)?>/);
// Read the actual attribute expression, then render it through Svelte to catch brace interpolation regressions.
const pattern=source.match(/pattern=(\{'[^']*'\}|"[^"]*")/)[1];
const code=compile('<input pattern='+pattern+'/>',{generate:'server'}).js.code;
const file=new URL('./verification-input.generated.mjs',import.meta.url);
try{
 await writeFile(file,code);const component=(await import(file.href)).default;
 const html=render(component).body;const actual=html.match(/pattern="([^"]*)"/)[1];assert.equal(actual,'[0-9]{6}');
 const regex=new RegExp('^(?:'+actual+')$','v');
 for(const value of ['012345','123456','999999','１２３４５６',' １２ ３４ ５６\n','\u200e123\u200b456\u200f'])assert.ok(regex.test(normalizeVerificationCode(value)));
 for(const value of ['12345','1234567','12x456','abcdef','16'])assert.ok(!regex.test(normalizeVerificationCode(value)));
 console.log('PASS: actual Svelte-rendered input accepts six digits; leading zeros, pasted formatting and full-width digits supported; invalid codes rejected.');
}finally{await unlink(file).catch(()=>{});}
