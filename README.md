# liplip

موقع عربي RTL لتعلّم الإنجليزية في العراق. الواجهة ثابتة وتُنشر من جذر المستودع عبر Cloudflare Pages بلا خطوة build للواجهة، بينما تعمل واجهات الخادم عبر Cloudflare Pages Functions وD1.

## الدراسة الحالية

المسار الفعّال في build 113 هو **٥ مستويات × ٥٠ صندوقاً تعليمياً = ٢٥٠ صندوقاً مؤلفاً**. داخل كل مستوى تضيف واجهة كنز الدراسة محطات مراجعة وامتحانات دورية وامتحاناً نهائياً من دون استبدال الصناديق الخمسين.

لأسباب توافق مع التقدم والمحتوى القديم، يبقى ترقيم الصناديق الداخلي بخطوة `200` بين المستويات: المستوى الأول يستخدم المعرّفات `1–50`، والثاني `201–250`، وهكذا. الواجهة تعرض رقم الصندوق داخل المستوى من ١ إلى ٥٠.

لكل صندوق ثلاث مراحل مرتبة:

1. **المفردات** — تعلم المحتوى ثم الاختبار.
2. **القواعد** — المقال/القواعد ثم الاختبار.
3. **شاهد واقرأ** — الفيديو وأسئلته ثم القصة وأسئلتها.

التقدم المحفوظ يحتفظ بالمعرّفات القديمة لتفادي كسر بيانات المستخدمين.

## إدارة محتوى Study وExcel

مستورد Study الفعّال هو `frontend/features/study-workbook-importer-v114.js`. يستورد ملف `.xlsx` موحداً يتضمن الأوراق التالية بعناوين أعمدة مطابقة تماماً:

- `Vocabulary`: `Level | Box | Order | English | Arabic | Voice`
- `Grammar`: `Level | Box | Title | Rule | Normal Formula | Negative Formula | Question Formula | Notes | Examples`
- `Grammar_Questions`: `Level | Box | Order | Type | Question | Correct Answer | Option 1 | Option 2 | Option 3 | Option 4`
- `Watch_Read`: `Level | Box | Story Order | Story Title | Story English | Story Arabic | YouTube URL | Video Title`
- `Video_Questions`: `Level | Box | Order | Question | Correct Answer | Option 1 | Option 2 | Option 3 | Option 4`
- `Story_Questions`: نفس بنية `Video_Questions`.

الحد الأقصى للملف 20 MiB. يجب أن تطابق `Correct Answer` أحد الخيارات في أسئلة الاختيار و`fill_blank`؛ يرفض المستورد مفتاح الإجابة غير المتطابق بدلاً من تحويله تلقائياً إلى الخيار الأول. تتم كتابة المحتوى محلياً أولاً ثم يُنشر إلى الخادم عند توفر واجهة نشر المحتوى وصلاحية الإدارة.

## الحسابات والمزامنة

`backend-client.js` محمّل فعلياً في `index.html` ويزامن حالة المتعلم مع `/api/session` و`/api/state` باستخدام revisions لمنع الاستبدال الصامت عند التعارض.

يدعم الخادم:

- جلسات ضيف؛
- حسابات بريد/كلمة مرور؛
- Google/Facebook OAuth عند ضبط أسرار المزوّد؛
- WhatsApp OTP عند ضبط أسرار WhatsApp؛
- نشر المحتوى المشترك عبر جلسة إدارة مستقلة.

راجع `BACKEND.md` قبل تشغيل الهوية الاجتماعية في الإنتاج؛ توجد نقاط hardening موثقة هناك، خصوصاً rate limiting لبعض المسارات وحماية استهلاك Gemini.

## Gemini والصوت

الصوت في المتصفح يستخدم Web Speech المحلي أولاً. `frontend/core/gemini-speech-v114.js` يستدعي Gemini TTS فقط إذا فشل الصوت المحلي أو عند طلب prefetch صريح، لتجنب استهلاك API غير الضروري.

واجهات Gemini الخادمية:

- `/api/gemini/speech`
- `/api/gemini/drawing`
- `/api/gemini/course-exam`

## الكاش والإصدارات

`_headers` يمنح ملفات `*.js` و`*.css` كاشاً immutable طويل الأجل. لذلك **لا يكفي تعديل محتوى ملف JavaScript منشور مع إبقاء URL نفسه**. أي إصلاح Runtime يجب أن يستخدم اسماً/URL جديداً أو bump متناسقاً للإصدار. لهذا تُحمّل إصلاحات هذا التدقيق من ملفات `v114` جديدة بدلاً من تغيير الملفات القديمة فقط.

حزمة CSS الفعّالة تُولد من المصادر المرتبة في `assets/styles.manifest.json`. لا تعدّل `assets/liplip-vNN.css` يدوياً.

## التحقق

شغّل جميع اختبارات JavaScript من جذر المستودع:

```bash
for test_file in test/*.test.js; do node "$test_file"; done
```

GitHub Actions يتحقق أيضاً من:

- وجود كل الأصول المحلية المحمّلة؛
- صحة syntax لكل JavaScript فعّال؛
- تطابق query version للأصول مع build المعلن؛
- حد عدد الأصول وحجم payload الأولي؛
- تطابق build حزمة CSS مع manifest؛
- إعادة توليد حزمة CSS byte-for-byte من مصادرها؛
- كامل ملفات `test/*.test.js`.

## النشر

في Cloudflare Pages:

- الفرع: `main`
- framework: `None`
- frontend build command: فارغ
- output directory: `.`
- D1 binding: `DB`

طبّق كل migrations في `migrations/` بالترتيب واضبط الأسرار المطلوبة كما هو موضح في `BACKEND.md`.

## ملاحظة المستوى

مؤشر A0–C2 داخل التطبيق مؤشر تعليمي داخلي وتجريبي، وليس شهادة CEFR رسمية.
