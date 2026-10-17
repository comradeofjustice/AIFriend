import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ request }) => {
 const { input } = await request.json();
 if (typeof input !== 'string' || !input.trim() || input.length > 4000) return json({ error: '语音文本需为 1–4000 字。' }, { status: 400 });
 if (!env.VOLC_TTS_API_KEY || !env.VOLC_TTS_VOICE_ID) return json({ error: '尚未配置豆包语音密钥或音色。' }, { status: 503 });
 try {
  const upstream = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
   method: 'POST', signal: AbortSignal.any([request.signal, AbortSignal.timeout(60000)]),
   headers: { 'Content-Type': 'application/json', 'X-Api-Key': env.VOLC_TTS_API_KEY, 'X-Api-Resource-Id': env.VOLC_TTS_RESOURCE_ID || 'seed-tts-2.0' },
   body: JSON.stringify({ user: { uid: 'utsuwa-preview' }, req_params: { text: input, speaker: env.VOLC_TTS_VOICE_ID, audio_params: { format: 'mp3', sample_rate: 24000 } } })
  });
  if (!upstream.ok) return json({ error: `豆包语音请求失败：HTTP ${upstream.status}` }, { status: 502 });
  const body = await upstream.text();
  const chunks: Uint8Array[] = [];
  for (const line of body.split(/\r?\n/)) {
   if (!line.trim()) continue;
   const item = JSON.parse(line);
   if (item.code !== 0 && item.code !== 20000000) return json({ error: item.message || `豆包语音错误 ${item.code}` }, { status: 502 });
   if (item.data) chunks.push(Uint8Array.from(atob(item.data), c => c.charCodeAt(0)));
  }
  if (!chunks.length) return json({ error: '语音服务返回了空音频。' }, { status: 502 });
  const audio = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) { audio.set(chunk, offset); offset += chunk.length; }
  return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
 } catch { return json({ error: '豆包语音连接失败，请检查开通状态。' }, { status: 502 }); }
};
