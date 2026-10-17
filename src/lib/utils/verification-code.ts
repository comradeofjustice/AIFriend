/** Normalize formatting from email copy/paste without accepting letters or extra digits. */
export function normalizeVerificationCode(value:unknown):string{
 return typeof value==='string'?value.normalize('NFKC').replace(/[\s\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g,''):'';
}
