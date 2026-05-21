#!/usr/bin/env node
// สร้างไฟล์เสียง MP3 ทั้งหมดผ่าน Azure Speech Neural voices
//   - alphabet (ก-ฮ / A-Z) → Premwadee (TH), Jenny (EN)         — learn-abc.html
//   - words (คำในคลัง 146 ตัว ×2 ภาษา) → Achara (TH), Ana (EN)  — memory + spelling
//   - math numbers/ops/feedback → Achara (TH), Aria (EN)         — math-game.html
//
// รัน:  node scripts/generate-audio.mjs                (ข้ามไฟล์ที่มีแล้ว)
//       node scripts/generate-audio.mjs --force        (ทำใหม่ทั้งหมด)
//       node scripts/generate-audio.mjs --only=words   (เลือกหมวด: alphabet|words|math)
//
// อ่าน key จาก .env (ค้นขึ้น parent dir): AZURE_SPEECH_KEY, AZURE_SPEECH_REGION

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ─── โหลด .env ───
async function loadEnv() {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const p = path.join(dir, '.env');
    try {
      const txt = await fs.readFile(p, 'utf8');
      for (const line of txt.split('\n')) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
      return p;
    } catch {}
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const envPath = await loadEnv();
const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION || 'southeastasia';
const FORCE = process.argv.includes('--force');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice('--only='.length);

if (!KEY) {
  console.error('ERROR: AZURE_SPEECH_KEY ไม่พบใน .env');
  process.exit(1);
}
if (envPath) console.log(`loaded env from ${envPath}`);

const ENDPOINT = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

// ─── เสียง ───
const VOICES = {
  alphabetTh:  'th-TH-PremwadeeNeural',  // learn-abc.html ก-ฮ
  alphabetEn:  'en-US-JennyNeural',      // learn-abc.html A-Z
  wordsTh:     'th-TH-PremwadeeNeural',  // memory + spelling (ไทย) — เปลี่ยนจาก Achara
  wordsEn:     'en-US-AnaNeural',        // memory + spelling (อังกฤษ - เสียงเด็ก)
  mathTh:      'th-TH-PremwadeeNeural',  // math-game (ไทย) — เปลี่ยนจาก Achara
  mathEn:      'en-US-AriaNeural',       // math-game (อังกฤษ)
};

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function ssml(voice, lang, text, ratePct = -10) {
  return `<speak version="1.0" xml:lang="${lang}"><voice name="${voice}"><prosody rate="${ratePct >= 0 ? '+' : ''}${ratePct}%">${esc(text)}</prosody></voice></speak>`;
}

async function synth(ssmlBody, outPath) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'kids-games-audio-gen',
    },
    body: ssmlBody,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`TTS ${res.status}: ${detail.slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buf);
  return buf.length;
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

// ═══════════════════════════════════════════════════════════════════
// ALPHABET (ก-ฮ, A-Z) — เสียงเดิม (Premwadee / Jenny) ใช้ใน learn-abc
// ═══════════════════════════════════════════════════════════════════

const THAI_LETTERS = [
  ['ก','กอ','ไก่',''],['ข','ขอ','ไข่','ในเล้า'],['ฃ','ขอ','ขวด','ของเรา'],['ค','คอ','ควาย','เข้านา'],
  ['ฅ','คอ','คน','ขึงขัง'],['ฆ','คอ','ระฆัง','ข้างฝา'],['ง','งอ','งู','ใจกล้า'],['จ','จอ','จาน','ใช้ดี'],
  ['ฉ','ฉอ','ฉิ่ง','ตีดัง'],['ช','ชอ','ช้าง','วิ่งหนี'],['ซ','ซอ','โซ่','ล่ามที'],['ฌ','ชอ','เฌอ','คู่กัน'],
  ['ญ','ยอ','หญิง','โสภา'],['ฎ','ดอ','ชฎา','สวมพลัน'],['ฏ','ตอ','ปฏัก','หุนหัน'],['ฐ','ถอ','ฐาน','เข้ามารอง'],
  ['ฑ','ทอ','มณโฑ','หน้าขาว'],['ฒ','ทอ','ผู้เฒ่า','เดินย่อง'],['ณ','นอ','เณร','ไม่มอง'],['ด','ดอ','เด็ก','ต้องนิมนต์'],
  ['ต','ตอ','เต่า','หลังตุง'],['ถ','ถอ','ถุง','แบกขน'],['ท','ทอ','ทหาร','อดทน'],['ธ','ทอ','ธง','คนนิยม'],
  ['น','นอ','หนู','ขวักไขว่'],['บ','บอ','ใบไม้','ทับถม'],['ป','ปอ','ปลา','ตากลม'],['ผ','ผอ','ผึ้ง','ทำรัง'],
  ['ฝ','ฝอ','ฝา','ทนทาน'],['พ','พอ','พาน','วางตั้ง'],['ฟ','ฟอ','ฟัน','สะอาดจัง'],['ภ','พอ','สำเภา','กางใบ'],
  ['ม','มอ','ม้า','คึกคัก'],['ย','ยอ','ยักษ์','เขี้ยวใหญ่'],['ร','รอ','เรือ','พายไป'],['ล','ลอ','ลิง','ไต่ราว'],
  ['ว','วอ','แหวน','ลงยา'],['ศ','สอ','ศาลา','เงียบเหงา'],['ษ','สอ','ฤๅษี','หนวดยาว'],['ส','สอ','เสือ','ดาวคะนอง'],
  ['ห','หอ','หีบ','ใส่ผ้า'],['ฬ','ลอ','จุฬา','ท่าผยอง'],['อ','ออ','อ่าง','เนืองนอง'],['ฮ','ฮอ','นกฮูก','ตาโต'],
];

const EN_LETTERS = [
  ['A','Apple','ah'],['B','Ball','buh'],['C','Cat','kuh'],['D','Dog','duh'],['E','Egg','eh'],
  ['F','Fish','fuh'],['G','Goat','guh'],['H','Hat','huh'],['I','Igloo','ih'],['J','Jellyfish','juh'],
  ['K','Key','kuh'],['L','Lion','luh'],['M','Monkey','muh'],['N','Nest','nuh'],['O','Octopus','oh'],
  ['P','Pig','puh'],['Q','Queen','kwuh'],['R','Rabbit','ruh'],['S','Sun','sss'],['T','Tiger','tuh'],
  ['U','Umbrella','uh'],['V','Violin','vuh'],['W','Watermelon','wuh'],['X','Box','ks'],['Y','Yo-yo','yuh'],
  ['Z','Zebra','zzz'],
];

function buildAlphabetTasks() {
  const tasks = [];
  THAI_LETTERS.forEach(([ch, name, thing, rhyme], i) => {
    const text = rhyme ? `${name} ${thing} ${rhyme}` : `${name} เอ๋ย ${name} ${thing}`;
    tasks.push({
      out: path.join(repoRoot, 'audio/alphabet/th', `${String(i+1).padStart(2,'0')}.mp3`),
      ssml: ssml(VOICES.alphabetTh, 'th-TH', text, -25),
      label: `alphabet TH ${ch} ${thing}`,
    });
  });
  EN_LETTERS.forEach(([ch, word, snd]) => {
    const text = `${ch} says ${snd}, ${snd}, ${word}.`;
    tasks.push({
      out: path.join(repoRoot, 'audio/alphabet/en', `${ch.toLowerCase()}.mp3`),
      ssml: ssml(VOICES.alphabetEn, 'en-US', text, -15),
      label: `alphabet EN ${ch} ${word}`,
    });
  });
  return tasks;
}

// ═══════════════════════════════════════════════════════════════════
// WORDS — อ่านจาก categories.js, gen ทั้ง TH (Achara) และ EN (Ana)
// ═══════════════════════════════════════════════════════════════════

async function loadCategories() {
  const txt = await fs.readFile(path.join(repoRoot, 'categories.js'), 'utf8');
  const fn = new Function(txt + '\nreturn { CATEGORIES, CATEGORY_KEYS };');
  return fn();
}

async function buildWordTasks() {
  const { CATEGORIES, CATEGORY_KEYS } = await loadCategories();
  const tasks = [];
  for (const k of CATEGORY_KEYS) {
    for (const it of CATEGORIES[k].items) {
      tasks.push({
        out: path.join(repoRoot, 'audio/words/th', it.category, `${it.slug}.mp3`),
        ssml: ssml(VOICES.wordsTh, 'th-TH', it.th, 0),  // rate ปกติ - ฟังธรรมชาติสุดสำหรับคำเดี่ยว
        label: `word TH ${it.category}/${it.slug} (${it.th})`,
      });
      tasks.push({
        out: path.join(repoRoot, 'audio/words/en', it.category, `${it.slug}.mp3`),
        ssml: ssml(VOICES.wordsEn, 'en-US', it.en, -5),
        label: `word EN ${it.category}/${it.slug} (${it.en})`,
      });
    }
  }
  return tasks;
}

// ═══════════════════════════════════════════════════════════════════
// MATH — ตัวเลข (0-99, hundreds, thousands) + ops + feedback
// pre-render เป็นชิ้นเล็ก ๆ เพื่อ stitch ใน browser ครอบคลุม 0-9999
// ═══════════════════════════════════════════════════════════════════

// Thai number reading (ครอบคลุม 0-99, 100, 200, ..., 900, 1000, ..., 9000, + 'เอ็ด')
const TH_DIGIT = ['ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า'];
function thaiSay(n) {
  if (n === 0) return 'ศูนย์';
  // 1-9
  if (n < 10) return TH_DIGIT[n];
  // 10-19
  if (n < 20) {
    if (n === 10) return 'สิบ';
    if (n === 11) return 'สิบเอ็ด';
    return 'สิบ' + TH_DIGIT[n - 10];
  }
  // 20-99
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    let tens;
    if (t === 2) tens = 'ยี่สิบ';
    else tens = TH_DIGIT[t] + 'สิบ';
    if (o === 0) return tens;
    if (o === 1) return tens + 'เอ็ด';
    return tens + TH_DIGIT[o];
  }
  // 100, 200, ..., 900 (อะตอม)
  if (n < 1000 && n % 100 === 0) return TH_DIGIT[n / 100] + 'ร้อย';
  // 1000, 2000, ..., 9000 (อะตอม)
  if (n < 10000 && n % 1000 === 0) return TH_DIGIT[n / 1000] + 'พัน';
  return null; // จะไม่ใช้ — pre-record เฉพาะอะตอม
}

const EN_DIGIT = ['zero','one','two','three','four','five','six','seven','eight','nine'];
const EN_TEEN  = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const EN_TENS  = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function englishSay(n) {
  if (n < 10) return EN_DIGIT[n];
  if (n < 20) return EN_TEEN[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    return o === 0 ? EN_TENS[t] : `${EN_TENS[t]}-${EN_DIGIT[o]}`;
  }
  if (n < 1000 && n % 100 === 0) return `${EN_DIGIT[n / 100]} hundred`;
  if (n < 10000 && n % 1000 === 0) return `${EN_DIGIT[n / 1000]} thousand`;
  return null;
}

function buildMathTasks() {
  const tasks = [];
  const numbersToBuild = [];
  for (let n = 0; n < 100; n++) numbersToBuild.push(n);
  for (let n = 100; n <= 900; n += 100) numbersToBuild.push(n);
  for (let n = 1000; n <= 9000; n += 1000) numbersToBuild.push(n);

  for (const n of numbersToBuild) {
    tasks.push({
      out: path.join(repoRoot, 'audio/math/th/n', `${n}.mp3`),
      ssml: ssml(VOICES.mathTh, 'th-TH', thaiSay(n), 0),
      label: `math TH n/${n} (${thaiSay(n)})`,
    });
    tasks.push({
      out: path.join(repoRoot, 'audio/math/en/n', `${n}.mp3`),
      ssml: ssml(VOICES.mathEn, 'en-US', englishSay(n), -5),
      label: `math EN n/${n} (${englishSay(n)})`,
    });
  }
  // เอ็ด สำหรับ 101, 201, ..., 1001, 9901 (TH เท่านั้น — EN ใช้ 'one' ปกติได้)
  tasks.push({
    out: path.join(repoRoot, 'audio/math/th/n', `et.mp3`),
    ssml: ssml(VOICES.mathTh, 'th-TH', 'เอ็ด', 0),
    label: `math TH n/et (เอ็ด)`,
  });

  // Ops
  const TH_OPS = { plus:'บวก', minus:'ลบ', times:'คูณ', divided:'หาร', question:'เท่ากับเท่าไร' };
  const EN_OPS = { plus:'plus', minus:'minus', times:'times', divided:'divided by', 'what-is':'what is' };
  for (const [k, v] of Object.entries(TH_OPS)) {
    tasks.push({
      out: path.join(repoRoot, 'audio/math/th/op', `${k}.mp3`),
      ssml: ssml(VOICES.mathTh, 'th-TH', v, 0),
      label: `math TH op/${k}`,
    });
  }
  for (const [k, v] of Object.entries(EN_OPS)) {
    tasks.push({
      out: path.join(repoRoot, 'audio/math/en/op', `${k}.mp3`),
      ssml: ssml(VOICES.mathEn, 'en-US', v, -5),
      label: `math EN op/${k}`,
    });
  }

  // Feedback
  const TH_FB = { correct:'ถูกค่ะ', retry:'ผิดค่ะ ลองใหม่', answer:'ผิดค่ะ คำตอบคือ' };
  const EN_FB = { correct:'Correct.', retry:'Try again.', answer:'The answer is' };
  for (const [k, v] of Object.entries(TH_FB)) {
    tasks.push({
      out: path.join(repoRoot, 'audio/math/th/fb', `${k}.mp3`),
      ssml: ssml(VOICES.mathTh, 'th-TH', v, 0),
      label: `math TH fb/${k}`,
    });
  }
  for (const [k, v] of Object.entries(EN_FB)) {
    tasks.push({
      out: path.join(repoRoot, 'audio/math/en/fb', `${k}.mp3`),
      ssml: ssml(VOICES.mathEn, 'en-US', v, -5),
      label: `math EN fb/${k}`,
    });
  }
  return tasks;
}

// ═══════════════════════════════════════════════════════════════════
// DINO NAMES — เสียงพูดชื่อไดโนเสาร์ (Premwadee) เล่นตอนจับคู่ได้
// ═══════════════════════════════════════════════════════════════════

const DINO_NAMES = [
  { key:'trex',    th:'ไทรันโนซอรัส' },
  { key:'tri',     th:'ไทรเซอราทอปส์' },
  { key:'brachio', th:'บราคิโอซอรัส' },
  { key:'stego',   th:'สเตโกซอรัส' },
  { key:'velo',    th:'เวโลซิแรปเตอร์' },
  { key:'ptero',   th:'เทอราโนดอน' },
  { key:'spino',   th:'สไปโนซอรัส' },
  { key:'anky',    th:'แอนคิโลซอรัส' },
  { key:'para',    th:'พาราซอโรโลฟัส' },
  { key:'diplo',   th:'ดิปโพลโดคัส' },
];

function buildDinoTasks() {
  return DINO_NAMES.map(d => ({
    out: path.join(repoRoot, 'audio/dinos/voice', `${d.key}.mp3`),
    ssml: ssml(VOICES.alphabetTh, 'th-TH', d.th, -15),  // Premwadee, ช้าหน่อยให้ฟังชัด
    label: `dino voice ${d.key} (${d.th})`,
  }));
}

// ═══════════════════════════════════════════════════════════════════
// FEED GAME — เสียง feedback ตอนป้อนอาหารไดโน
// ═══════════════════════════════════════════════════════════════════

const FEED_PHRASES = {
  yum:   'อร่อยมาก ขอบคุณนะ',
  no:    'ไม่ใช่ตัวนี้นะ ลองอีกครั้ง',
  done:  'เก่งมาก ป้อนครบทุกตัวแล้ว',
};

function buildFeedTasks() {
  return Object.entries(FEED_PHRASES).map(([key, text]) => ({
    out: path.join(repoRoot, 'audio/feed', `${key}.mp3`),
    ssml: ssml(VOICES.alphabetTh, 'th-TH', text, -10),
    label: `feed ${key} (${text})`,
  }));
}

// ═══════════════════════════════════════════════════════════════════
// Run
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const tasks = [];
  if (!ONLY || ONLY === 'alphabet') tasks.push(...buildAlphabetTasks());
  if (!ONLY || ONLY === 'words')    tasks.push(...await buildWordTasks());
  if (!ONLY || ONLY === 'math')     tasks.push(...buildMathTasks());
  if (!ONLY || ONLY === 'dinos')    tasks.push(...buildDinoTasks());
  if (!ONLY || ONLY === 'feed')     tasks.push(...buildFeedTasks());

  console.log(`\nวางแผนสร้าง ${tasks.length} ไฟล์${ONLY ? ` (เฉพาะ ${ONLY})` : ''}\n`);

  let made = 0, skipped = 0, failed = 0;
  for (const t of tasks) {
    if (await exists(t.out) && !FORCE) {
      skipped++;
      if (skipped <= 5 || skipped % 50 === 0) console.log(`skip  ${t.label}`);
      continue;
    }
    try {
      const bytes = await synth(t.ssml, t.out);
      console.log(`done  ${t.label}  (${bytes} bytes)`);
      made++;
      await new Promise(r => setTimeout(r, 100)); // Azure F0 throttle protection
    } catch (e) {
      console.error(`FAIL  ${t.label}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\nสรุป: สร้างใหม่ ${made} | ข้าม ${skipped} | ผิดพลาด ${failed}`);
  if (failed > 0) process.exit(1);
}

await main();
