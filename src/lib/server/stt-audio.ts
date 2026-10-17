import { randomBytes } from 'node:crypto';
const recordings = new Map<string, { audio: Uint8Array; expires: number }>();
export function registerRecording(audio: Uint8Array): string {
 for (const [key, value] of recordings) if (value.expires < Date.now()) recordings.delete(key);
 if (recordings.size >= 8) throw new Error('语音识别正在处理较多请求，请稍后重试。');
 const token = randomBytes(24).toString('hex');
 recordings.set(token, { audio, expires: Date.now() + 90000 });
 return token;
}
export function readRecording(token: string): Uint8Array | undefined {
 const item = recordings.get(token);
 if (!item || item.expires < Date.now()) { recordings.delete(token); return undefined; }
 return item.audio;
}
export function removeRecording(token: string) { recordings.delete(token); }
