import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { registerRecording, removeRecording } from '$lib/server/stt-audio';
import type { RequestHandler } from './$types';
const convertAudio = promisify(execFile);
const error = (message: string, status: number) => json({ error: { message } }, { status });
export const POST: RequestHandler = async ({ request }) => {
 if (!env.VOLC_ASR_API_KEY) return error('服务器缺少语音识别 Key。', 503);
 let directory: string | undefined;
 let token: string | undefined;
 try {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) return error('请录制 2 分钟以内的语音，文件不能超过 10MB。', 400);
  directory = await mkdtemp(join(tmpdir(), 'utsuwa-stt-'));
  const input = join(directory, 'input');
  const output = join(directory, 'audio.wav');
  await writeFile(input, Buffer.from(await file.arrayBuffer()));
  try {
   await convertAudio('/usr/bin/ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', input, '-t', '120', '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', output], { timeout: 20000, maxBuffer: 1024 * 1024 });
  } catch { return error('录音格式无法解析，请重新录音。', 400); }
  const audio = new Uint8Array(await readFile(output));
  if (audio.length < 3200) return error('录音太短，请说完一句话后再停止。', 400);
  token = registerRecording(audio);
  const response = await fetch('https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash', {
   method: 'POST', signal: AbortSignal.any([request.signal, AbortSignal.timeout(50000)]),
   headers: { 'Content-Type': 'application/json', 'X-Api-Key': env.VOLC_ASR_API_KEY, 'X-Api-Resource-Id': env.VOLC_ASR_RESOURCE_ID || 'volc.bigasr.auc_turbo', 'X-Api-Request-Id': randomUUID(), 'X-Api-Sequence': '-1' },
   body: JSON.stringify({ user: { uid: 'utsuwa' }, audio: { url: `${env.ORIGIN}/api/stt/audio/${token}`, format: 'wav', rate: 16000, bits: 16, channel: 1 }, request: { model_name: 'bigmodel', enable_itn: true, enable_punc: true } })
  });
  const data = await response.json().catch(() => ({}));
  const code = response.headers.get('X-Api-Status-Code') || String(data.header?.code || '');
  if (response.status === 403 || code === '45000030') return error('请在豆包语音控制台开通「录音文件识别极速版」（volc.bigasr.auc_turbo），当前 Key 尚无该服务权限。', 403);
  if (!response.ok || (code && code !== '20000000')) return error('豆包语音识别失败，请检查服务开通状态后重试。', 502);
  return json({ text: typeof data.result?.text === 'string' ? data.result.text.trim() : '' }, { headers: { 'Cache-Control': 'no-store' } });
 } catch (cause) {
  if (request.signal.aborted) return error('录音已取消。', 499);
  return error(cause instanceof Error && cause.message.includes('较多请求') ? cause.message : '语音识别连接失败或超时，请稍后重试。', 502);
 } finally {
  if (token) removeRecording(token);
  if (directory) await rm(directory, { recursive: true, force: true });
 }
};
