import ts from 'typescript';
import { readFile } from 'node:fs/promises';
export async function load(url, context, nextLoad) {
 if (url.endsWith('.ts')) return {format:'module',shortCircuit:true,source:ts.transpileModule(await readFile(new URL(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText};
 return nextLoad(url,context);
}

export async function resolve(specifier,context,nextResolve){
 if(specifier.startsWith('$lib/'))specifier=new URL('../../src/lib/'+specifier.slice(5)+'.ts',import.meta.url).href;

 try{return await nextResolve(specifier,context);}catch(error){if(specifier.startsWith('.')&&!specifier.endsWith('.ts')&&!specifier.endsWith('.mjs'))return nextResolve(specifier+'.ts',context);throw error;}
}
