import { readRecording } from '$lib/server/stt-audio';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = ({ params }) => {
 const audio = readRecording(params.token);
 if (!audio) return new Response(null, { status: 404 });
 return new Response(new Uint8Array(audio), { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
};
