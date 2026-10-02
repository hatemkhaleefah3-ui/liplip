const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
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
    letter: 'Say only this English letter name, exactly once. Do not say letter, capital, lowercase, an example, or any other word. Do not repeat it.',
    number: 'Say only this English number name, exactly once. Do not add an introduction, explanation, example, or repeat it.',
    word: 'Pronounce the word once, clearly, with natural stress.',
    sentence: 'Read the sentence verbatim with clear phrasing and natural pauses.'
  }[kind];
  return `${locale} educational voice for a beginner. Warm, clear, and moderately slow. ${task}`;
}

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY) return json({ error: 'gemini_not_configured' }, 503);
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'forbidden' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const inputText = String(body?.text || '').trim();
  const kind = String(body?.kind || '');
  const language = String(body?.language || 'en-US').trim();
  if (!Object.hasOwn(LIMITS, kind) || !inputText || inputText.length > LIMITS[kind]) return json({ error: 'invalid_speech_input' }, 400);
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language)) return json({ error: 'invalid_language' }, 400);
  const text = exactTranscript(inputText, kind);
  if (!text) return json({ error: 'invalid_speech_transcript' }, 400);

  const model = env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts';
  let response;
  try {
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        model,
        store: false,
        input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style: educationalStyle(kind, language) }] }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice: env.GEMINI_TTS_VOICE || 'Kore' }] }
      })
    });
  } catch { return json({ error: 'gemini_tts_unavailable' }, 502); }
  if (!response.ok) return json({ error: 'gemini_tts_failed', upstreamStatus: response.status }, 502);
  const output = await response.json();
  const blocks = [
    output?.output_audio,
    ...(Array.isArray(output?.steps) ? output.steps.flatMap(step => Array.isArray(step?.content) ? step.content : []) : [])
  ];
  const audioBlock = blocks.find(block => typeof block?.data === 'string' && block.data.length);
  if (!audioBlock) return json({ error: 'missing_audio' }, 502);
  let bytes;
  try { bytes = Uint8Array.from(atob(audioBlock.data), char => char.charCodeAt(0)); }
  catch { return json({ error: 'invalid_audio' }, 502); }
  const mime = String(audioBlock.mime_type || audioBlock.mimeType || 'audio/wav');
  if (!mime.startsWith('audio/')) return json({ error: 'invalid_audio_type' }, 502);
  return new Response(bytes, { headers: { 'content-type': mime, 'cache-control': 'private, max-age=86400', 'x-liplip-speech-kind': kind } });
}
