// ─── Shared audio player สำหรับเกมทุกตัว ───
// เล่น MP3 ที่ pre-render ไว้ (Azure Neural voices) แบบเรียงต่อกัน + fallback ไป Web TTS ถ้าไฟล์ไม่มี
// ใช้: AudioPlayer.playSequence(urls) | AudioPlayer.playOrSpeak(urls, fallbackText, lang)
//
// สำหรับเกมคณิต: AudioPlayer.thaiNumberUrls(n) / englishNumberUrls(n) ตัวเลข 0-9999 → array ของ URL
//
window.AudioPlayer = (function () {
  let enabled = true;
  let token = 0; // ใช้ยกเลิก sequence ที่กำลังเล่นค้าง

  function stop() {
    token++;
    if (typeof speechSynthesis !== 'undefined') {
      try { speechSynthesis.cancel(); } catch {}
    }
  }

  function setEnabled(v) {
    enabled = v;
    if (!v) stop();
  }

  // เล่นไฟล์เดียว คืน Promise<boolean> (true = เล่นจนจบและไม่ถูกยกเลิก)
  function playOne(url, myToken) {
    return new Promise(resolve => {
      if (myToken !== token) return resolve(false);
      const a = new Audio(url);
      a.onended = () => resolve(myToken === token);
      a.onerror = () => resolve(false);
      a.play().catch(() => resolve(false));
    });
  }

  // เล่น URL ต่อกัน — คืน Promise<boolean> = true ถ้าเล่นครบและไม่ถูกยกเลิก
  async function playSequence(urls) {
    if (!enabled) return false;
    stop();
    const myToken = token;
    for (const url of urls) {
      const ok = await playOne(url, myToken);
      if (!ok) return false;
    }
    return true;
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

  // เล่นไฟล์ก่อน — ถ้าพังตกไป Web TTS
  async function playOrSpeak(urls, fallbackText, lang) {
    if (!enabled) return;
    const ok = await playSequence(urls);
    if (!ok && fallbackText) speak(fallbackText, lang);
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
