import { readJson } from '../../_lib/http.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

const LIMITS = { letter: 32, number: 64, word: 80, sentence: 600 };

const NUMBER_NAMES = [
  'zero','one','two','three','four','five','six','seven','eight','nine',
  'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen',
  'seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two',
  'twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven',
  'twenty-eight','twenty-nine','thirty','thirty-one','thirty-two',
  'thirty-three','thirty-four'
];

function exactTranscript(text, kind) {
  if (kind === 'letter') return /^[A-Za-z]$/.test(text) ? text.toUpperCase() : '';
  if (kind === 'number') {
    if (/^\d{1,2}$/.test(text)) return NUMBER_NAMES[Number(text)] || '';
    const normalized = text.toLowerCase();
    return NUMBER_NAMES.includes(normalized) ? normalized : '';
  }
  return text;
}

function educationalStyle(kind, language) {
  const arabic = language.toLowerCase().startsWith('ar');
  const locale = arabic ? 'Iraqi Arabic' : 'English';
  const task = {
    letter: 'Say only this English letter name, exactly once. Do not say the word letter, an example, or anything else.',
    number: 'Say only this English number name, exactly once. Do not add an introduction, explanation, example, or repetition.',
    word: 'Pronounce only this word once, clearly, with natural stress.',
    sentence: 'Read this sentence verbatim with clear phrasing and natural pauses.'
  }[kind];
  return `${locale} educational voice for a beginner. Warm, clear, and moderately slow. ${task}`;
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY) return json({ error: 'gemini_not_configured' }, 503);
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'forbidden' }, 403);

  let body;
  try { body = await readJson(request, 16 * 1024); }
  catch (e) { return json({ error: e.code || 'invalid_json' }, e.status || 400); }

  const inputText = String(body?.text || '').trim();
  const kind = String(body?.kind || '');
  const language = String(body?.language || 'en-US').trim();

  if (!Object.hasOwn(LIMITS, kind) || !inputText || inputText.length > LIMITS[kind]) {
    return json({ error: 'invalid_speech_input' }, 400);
  }
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language)) {
    return json({ error: 'invalid_language' }, 400);
  }

  const text = exactTranscript(inputText, kind);
  if (!text) return json({ error: 'invalid_speech_transcript' }, 400);

  const model = env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts';
  const voice = env.GEMINI_TTS_VOICE || 'Kore';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let upstream;
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text,
            speech_metadata: { style: educationalStyle(kind, language) }
          }]
        }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { voice }
          }
        }
      })
    });
  } catch {
    return json({ error: 'gemini_tts_unavailable' }, 502);
  }

  if (!upstream.ok) {
    let detail = '';
    try {
      const payload = await upstream.json();
      detail = String(payload?.error?.message || payload?.error?.status || '');
    } catch {}
    const status = upstream.status === 429 ? 429 : 502;
    return json({
      error: upstream.status === 429 ? 'RESOURCE_EXHAUSTED' : 'gemini_tts_failed',
      upstreamStatus: upstream.status,
      detail: detail.slice(0, 240)
    }, status);
  }

  let output;
  try {
    output = await upstream.json();
  } catch {
    return json({ error: 'invalid_gemini_response' }, 502);
  }

  const parts = output?.candidates?.[0]?.content?.parts;
  const audioPart = Array.isArray(parts)
    ? parts.find(part => typeof (part?.inlineData?.data || part?.inline_data?.data) === 'string')
    : null;
  const inline = audioPart?.inlineData || audioPart?.inline_data;
  const data = inline?.data;

  if (!data) return json({ error: 'missing_audio' }, 502);

  let bytes;
  try {
    bytes = base64ToBytes(data);
  } catch {
    return json({ error: 'invalid_audio' }, 502);
  }

  const mime = String(inline?.mimeType || inline?.mime_type || 'audio/wav');
  if (!mime.startsWith('audio/')) return json({ error: 'invalid_audio_type' }, 502);

  return new Response(bytes, {
    headers: {
      'content-type': mime,
      'cache-control': 'private, max-age=86400',
      'x-liplip-speech-kind': kind,
      'x-liplip-speech-model': model
    }
  });
}
