// ─── Shared audio player สำหรับเกมทุกตัว ───
// เล่น MP3 ที่ pre-render ไว้ (Azure Neural voices) แบบเรียงต่อกัน + fallback ไป Web TTS ถ้าไฟล์ไม่มี
// ใช้: AudioPlayer.playSequence(urls) | AudioPlayer.playOrSpeak(urls, fallbackText, lang)
//
// สำหรับเกมคณิต: AudioPlayer.thaiNumberUrls(n) / englishNumberUrls(n) ตัวเลข 0-9999 → array ของ URL
//
window.AudioPlayer = (function () {
  let enabled = true;
  let token = 0;
  const pending = new Set();  // cancel fns ของ playback ที่ยังเล่นอยู่

  // ─── Web Audio context (สำหรับ gapless playback) ───
  let audioCtx = null;
  function ctx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      try { audioCtx.resume(); } catch {}
    }
    return audioCtx;
  }
  // unlock context จาก user gesture (iOS)
  // iOS ต้อง resume() + เล่น silent buffer ใน gesture จริง ๆ ไม่งั้นเสียงที่เล่นใน setTimeout ภายหลังจะเงียบ
  let _unlockedAudio = false;
  function _unlock() {
    const c = ctx();
    if (!c) return;
    if (c.state === 'suspended') { try { c.resume(); } catch {} }
    if (_unlockedAudio) return;
    try {
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
      _unlockedAudio = true;
    } catch {}
    // ปลดล็อก SpeechSynthesis ด้วย (fallback path) — พูดข้อความว่างใน gesture
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        speechSynthesis.speak(u);
      }
    } catch {}
  }
  document.addEventListener('pointerdown', _unlock, { capture: true });
  document.addEventListener('touchstart', _unlock, { capture: true, passive: true });
  document.addEventListener('click', _unlock, { capture: true });

  // ─── decode + cache เก็บ AudioBuffer ของแต่ละ URL ───
  const bufCache = new Map();
  async function loadBuffer(url) {
    if (bufCache.has(url)) return bufCache.get(url);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const ab = await r.arrayBuffer();
    const c = ctx();
    if (!c) throw new Error('no AudioContext');
    // Safari เก่าต้องใช้ callback form, ใหม่รองรับทั้ง promise
    const buf = await new Promise((resolve, reject) => {
      const ret = c.decodeAudioData(ab, resolve, reject);
      if (ret && typeof ret.then === 'function') ret.then(resolve, reject);
    });
    bufCache.set(url, buf);
    return buf;
  }

  // ─── ตัด silence ที่หัว/ท้าย buffer (ลด gap ระหว่างคลิปต่อ ๆ กัน) ───
  // คืน [offset, duration] วินาที สำหรับใช้กับ AudioBufferSourceNode.start()
  function trimRange(buf, threshold = 0.012) {
    const data = buf.getChannelData(0);
    let s = 0, e = data.length - 1;
    while (s < e && Math.abs(data[s]) < threshold) s++;
    while (e > s && Math.abs(data[e]) < threshold) e--;
    // เหลือ guard เล็ก ๆ ที่ขอบเพื่อไม่ตัดเสียงพยัญชนะต้นคำ
    const guardHead = Math.floor(buf.sampleRate * 0.015); // 15ms
    const guardTail = Math.floor(buf.sampleRate * 0.025); // 25ms
    s = Math.max(0, s - guardHead);
    e = Math.min(data.length, e + guardTail);
    return [s / buf.sampleRate, (e - s) / buf.sampleRate];
  }

  function stop() {
    token++;
    for (const cancel of pending) { try { cancel(); } catch {} }
    pending.clear();
    if (typeof speechSynthesis !== 'undefined') {
      try { speechSynthesis.cancel(); } catch {}
    }
  }

  function setEnabled(v) {
    enabled = v;
    if (!v) stop();
  }

  // เล่น URL ต่อกันแบบ gapless ด้วย Web Audio API — sample-accurate ไม่มี gap ระหว่างคลิป
  // คืน Promise<'ok'|'error'|'cancelled'>
  async function playSequence(urls) {
    if (!enabled) return 'cancelled';
    stop();
    const myToken = token;
    const c = ctx();
    if (!c) return 'error';

    // โหลด+decode คลิปทั้งหมดพร้อมกัน
    let buffers;
    try {
      buffers = await Promise.all(urls.map(loadBuffer));
    } catch (e) {
      return 'error';
    }
    if (myToken !== token) return 'cancelled';

    // schedule แบบ sample-accurate ใช้ trimRange ลบ silence
    let when = c.currentTime + 0.04; // lead-in สั้น ๆ
    const sources = [];
    for (const buf of buffers) {
      const [offset, dur] = trimRange(buf);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(when, offset, dur);
      sources.push(src);
      when += dur;
    }

    let cancelled = false;
    let wakeWait;
    const waitDone = new Promise(res => { wakeWait = res; });
    const cancel = () => {
      cancelled = true;
      for (const s of sources) { try { s.stop(); } catch {} }
      wakeWait();
    };
    pending.add(cancel);

    const totalMs = (when - c.currentTime) * 1000;
    const timer = setTimeout(wakeWait, totalMs);
    await waitDone;
    clearTimeout(timer);
    pending.delete(cancel);

    if (cancelled || myToken !== token) return 'cancelled';
    return 'ok';
  }

  // Web Speech fallback (รุ่นเสริม — ใช้ตอน MP3 หาย/ไม่มี)
  let lastSpeak = 0;
  function speak(text, lang) {
    if (!enabled) return false;
    if (!('speechSynthesis' in window)) return false;
    const now = Date.now();
    if (now - lastSpeak < 250) return false;
    lastSpeak = now;
    try {
      if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'en' ? 'en-US' : 'th-TH';
      const code = lang === 'en' ? 'en' : 'th';
      const matches = (speechSynthesis.getVoices() || []).filter(v => v.lang && v.lang.toLowerCase().startsWith(code));
      const v = matches.find(v => /kanya|narisa|premwadee|achara|niwat|aria|ana|jenny|siri|google|natural|neural/i.test(v.name))
             || matches.find(v => v.localService)
             || matches[0];
      if (v) u.voice = v;
      u.rate = 0.85;
      u.pitch = 1.0;
      u.volume = 1;
      speechSynthesis.speak(u);
      return true;
    } catch { return false; }
  }
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

  // เล่นไฟล์ก่อน — ถ้าไฟล์พัง ('error') ค่อยตกไป Web TTS
  // กรณี 'cancelled' (โดน playback ใหม่แทรก) จะไม่ fallback เพื่อไม่ให้เสียงซ้อนกัน
  async function playOrSpeak(urls, fallbackText, lang) {
    if (!enabled) return;
    const r = await playSequence(urls);
    if (r === 'error' && fallbackText) speak(fallbackText, lang);
  }

  // ─── Number decomposition (math game) ───────────────────────────
  // ครอบคลุม 0-9999 โดยอ่านจาก atomic clips ใน audio/math/<lang>/n/
  function thaiNumberUrls(n, base = 'audio/math/th/n') {
    if (n < 0 || n > 9999 || !Number.isInteger(n)) return [];
    if (n < 100) return [`${base}/${n}.mp3`];
    if (n < 1000) {
      const h = Math.floor(n / 100) * 100, r = n % 100;
      const urls = [`${base}/${h}.mp3`];
      if (r === 1) urls.push(`${base}/et.mp3`);              // 101 → หนึ่งร้อยเอ็ด
      else if (r > 0) urls.push(`${base}/${r}.mp3`);
      return urls;
    }
    // 1000-9999
    const t = Math.floor(n / 1000) * 1000, rest = n % 1000;
    const urls = [`${base}/${t}.mp3`];
    if (rest === 0) return urls;
    if (rest === 1) { urls.push(`${base}/et.mp3`); return urls; } // 1001 → หนึ่งพันเอ็ด
    urls.push(...thaiNumberUrls(rest, base));
    return urls;
  }

  function englishNumberUrls(n, base = 'audio/math/en/n') {
    if (n < 0 || n > 9999 || !Number.isInteger(n)) return [];
    if (n < 100) return [`${base}/${n}.mp3`];
    if (n < 1000) {
      const h = Math.floor(n / 100) * 100, r = n % 100;
      const urls = [`${base}/${h}.mp3`];
      if (r > 0) urls.push(`${base}/${r}.mp3`);
      return urls;
    }
    const t = Math.floor(n / 1000) * 1000, rest = n % 1000;
    const urls = [`${base}/${t}.mp3`];
    if (rest > 0) urls.push(...englishNumberUrls(rest, base));
    return urls;
  }

  return {
    setEnabled, stop, playSequence, speak, playOrSpeak,
    thaiNumberUrls, englishNumberUrls,
    get enabled() { return enabled; },
  };
})();
