/* v60: direct Gemini TTS for letter/number literacy controls, independent of Web Speech. */
(() => {
  'use strict';

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const EN_NUM = [
    'zero','one','two','three','four','five','six','seven','eight','nine',
    'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen',
    'seventeen','eighteen','nineteen','twenty','twenty-one','twenty-two',
    'twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven',
    'twenty-eight','twenty-nine','thirty','thirty-one','thirty-two',
    'thirty-three','thirty-four'
  ];
  const AR_NUM = [
    'صفر','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة',
    'عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر',
    'سبعة عشر','ثمانية عشر','تسعة عشر','عشرون','واحد وعشرون','اثنان وعشرون',
    'ثلاثة وعشرون','أربعة وعشرون','خمسة وعشرون','ستة وعشرون','سبعة وعشرون',
    'ثمانية وعشرون','تسعة وعشرون','ثلاثون','واحد وثلاثون','اثنان وثلاثون',
    'ثلاثة وثلاثون','أربعة وثلاثون'
  ];
  const BASE_AR = {
    A:'ألف',B:'باء',C:'سي',D:'دي',E:'إي',F:'إف',G:'جي',H:'إيتش',I:'آي',J:'جاي',
    K:'كاي',L:'إل',M:'إم',N:'إن',O:'أو',P:'بي',Q:'كيو',R:'آر',S:'إس',T:'تي',
    U:'يو',V:'في',W:'دبليو',X:'إكس',Y:'واي',Z:'زي'
  };

  function target() {
    const state = window.LiplipLiteracy;
    if (!state || !['letters', 'numbers'].includes(state.mode)) return null;
    const index = Math.max(0, Number(state.index) || 0);
    const arabicFace = state.stage === 'learn' && state.face === false;

    if (state.mode === 'letters') {
      const letter = LETTERS[Math.min(index, LETTERS.length - 1)] || 'A';
      return arabicFace
        ? { text: BASE_AR[letter] || letter, language: 'ar-IQ', kind: 'word' }
        : { text: letter, language: 'en-US', kind: 'letter' };
    }

    const n = Math.min(index, EN_NUM.length - 1);
    return arabicFace
      ? { text: AR_NUM[n], language: 'ar-IQ', kind: 'word' }
      : { text: String(n), language: 'en-US', kind: 'number' };
  }

  function message(button, text) {
    button.dataset.voiceError = text || '';
    if (text) button.setAttribute('title', text);
    else button.removeAttribute('title');
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-lit36="sound"]');
    if (!button) return;

    const payload = target();
    const service = window.LiplipGeminiSpeech;
    if (!payload || !service?.speak) return;

    // Own this control so legacy Web Speech wrappers cannot swallow the request.
    event.preventDefault();
    event.stopImmediatePropagation();
    message(button, '');

    service.speak(payload.text, {
      language: payload.language,
      kind: payload.kind,
      volume: 1
    }).catch(error => {
      const code = String(error?.message || '');
      const text = code === 'gemini_not_configured'
        ? 'Gemini API key is unavailable in this deployment.'
        : code.includes('RESOURCE_EXHAUSTED') || code.includes('429')
          ? 'Gemini quota is temporarily exhausted.'
          : `Gemini voice failed${code ? `: ${code}` : '.'}`;
      message(button, text);
      console.error('[liplip] literacy Gemini voice', error);
    });
  }, true);
})();
