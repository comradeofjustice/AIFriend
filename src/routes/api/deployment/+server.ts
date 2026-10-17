import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
export const GET = () => json({
 provider: env.ARK_BASE_URL ? 'openai-compatible' : '',
 baseUrl: env.ARK_BASE_URL || '',
 model: env.ARK_MODEL || '',
 ready: Boolean(env.ARK_API_KEY),
 asrReady: Boolean(env.VOLC_ASR_API_KEY),
 ttsReady: Boolean(env.VOLC_TTS_API_KEY && env.VOLC_TTS_VOICE_ID),
 voice: env.VOLC_TTS_VOICE_ID || '',
 ttsModel: env.VOLC_TTS_RESOURCE_ID || 'seed-tts-2.0',
}, { headers: { 'Cache-Control': 'no-store' } });
