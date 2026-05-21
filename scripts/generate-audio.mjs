#!/usr/bin/env node
// สร้างไฟล์เสียง MP3 ทั้งหมดสำหรับ learn-abc.html ผ่าน Azure Speech (Premwadee + Jenny)
// รัน:  node scripts/generate-audio.mjs          (ข้ามไฟล์ที่มีแล้ว)
//       node scripts/generate-audio.mjs --force  (สร้างทับ)
//
// อ่าน key จาก .env (ค้นขึ้น parent dir ได้):
//   AZURE_SPEECH_KEY=...
//   AZURE_SPEECH_REGION=southeastasia

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ─── โหลด .env แบบไม่ต้องมี dep ───
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

if (!KEY) {
  console.error('ERROR: AZURE_SPEECH_KEY ไม่พบใน .env');
  console.error('สร้างไฟล์ .env (ที่ repo root) เนื้อหา:');
  console.error('  AZURE_SPEECH_KEY=<key จาก Azure Speech resource>');
  console.error('  AZURE_SPEECH_REGION=southeastasia');
  process.exit(1);
}
if (envPath) console.log(`loaded env from ${envPath}`);

const ENDPOINT = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
const VOICE_TH = 'th-TH-PremwadeeNeural';
const VOICE_EN = 'en-US-JennyNeural';

// ─── ข้อมูล ก-ฮ (ตรงกับ learn-abc.html) ───
const THAI = [
  { ch:'ก', name:'กอ', thing:'ไก่',    rhyme:'' },
  { ch:'ข', name:'ขอ', thing:'ไข่',    rhyme:'ในเล้า' },
  { ch:'ฃ', name:'ขอ', thing:'ขวด',   rhyme:'ของเรา' },
  { ch:'ค', name:'คอ', thing:'ควาย',  rhyme:'เข้านา' },
  { ch:'ฅ', name:'คอ', thing:'คน',     rhyme:'ขึงขัง' },
  { ch:'ฆ', name:'คอ', thing:'ระฆัง', rhyme:'ข้างฝา' },
  { ch:'ง', name:'งอ', thing:'งู',     rhyme:'ใจกล้า' },
  { ch:'จ', name:'จอ', thing:'จาน',   rhyme:'ใช้ดี' },
  { ch:'ฉ', name:'ฉอ', thing:'ฉิ่ง',   rhyme:'ตีดัง' },
  { ch:'ช', name:'ชอ', thing:'ช้าง',  rhyme:'วิ่งหนี' },
  { ch:'ซ', name:'ซอ', thing:'โซ่',    rhyme:'ล่ามที' },
  { ch:'ฌ', name:'ชอ', thing:'เฌอ',   rhyme:'คู่กัน' },
  { ch:'ญ', name:'ยอ', thing:'หญิง',  rhyme:'โสภา' },
  { ch:'ฎ', name:'ดอ', thing:'ชฎา',   rhyme:'สวมพลัน' },
  { ch:'ฏ', name:'ตอ', thing:'ปฏัก',  rhyme:'หุนหัน' },
  { ch:'ฐ', name:'ถอ', thing:'ฐาน',   rhyme:'เข้ามารอง' },
  { ch:'ฑ', name:'ทอ', thing:'มณโฑ',  rhyme:'หน้าขาว' },
  { ch:'ฒ', name:'ทอ', thing:'ผู้เฒ่า',rhyme:'เดินย่อง' },
  { ch:'ณ', name:'นอ', thing:'เณร',   rhyme:'ไม่มอง' },
  { ch:'ด', name:'ดอ', thing:'เด็ก',  rhyme:'ต้องนิมนต์' },
  { ch:'ต', name:'ตอ', thing:'เต่า',  rhyme:'หลังตุง' },
  { ch:'ถ', name:'ถอ', thing:'ถุง',    rhyme:'แบกขน' },
  { ch:'ท', name:'ทอ', thing:'ทหาร',  rhyme:'อดทน' },
  { ch:'ธ', name:'ทอ', thing:'ธง',     rhyme:'คนนิยม' },
  { ch:'น', name:'นอ', thing:'หนู',    rhyme:'ขวักไขว่' },
  { ch:'บ', name:'บอ', thing:'ใบไม้', rhyme:'ทับถม' },
  { ch:'ป', name:'ปอ', thing:'ปลา',   rhyme:'ตากลม' },
  { ch:'ผ', name:'ผอ', thing:'ผึ้ง',   rhyme:'ทำรัง' },
  { ch:'ฝ', name:'ฝอ', thing:'ฝา',     rhyme:'ทนทาน' },
  { ch:'พ', name:'พอ', thing:'พาน',   rhyme:'วางตั้ง' },
  { ch:'ฟ', name:'ฟอ', thing:'ฟัน',    rhyme:'สะอาดจัง' },
  { ch:'ภ', name:'พอ', thing:'สำเภา', rhyme:'กางใบ' },
  { ch:'ม', name:'มอ', thing:'ม้า',    rhyme:'คึกคัก' },
  { ch:'ย', name:'ยอ', thing:'ยักษ์',  rhyme:'เขี้ยวใหญ่' },
  { ch:'ร', name:'รอ', thing:'เรือ',   rhyme:'พายไป' },
  { ch:'ล', name:'ลอ', thing:'ลิง',    rhyme:'ไต่ราว' },
  { ch:'ว', name:'วอ', thing:'แหวน',  rhyme:'ลงยา' },
  { ch:'ศ', name:'สอ', thing:'ศาลา',  rhyme:'เงียบเหงา' },
  { ch:'ษ', name:'สอ', thing:'ฤๅษี',   rhyme:'หนวดยาว' },
  { ch:'ส', name:'สอ', thing:'เสือ',   rhyme:'ดาวคะนอง' },
  { ch:'ห', name:'หอ', thing:'หีบ',    rhyme:'ใส่ผ้า' },
  { ch:'ฬ', name:'ลอ', thing:'จุฬา',  rhyme:'ท่าผยอง' },
  { ch:'อ', name:'ออ', thing:'อ่าง',   rhyme:'เนืองนอง' },
  { ch:'ฮ', name:'ฮอ', thing:'นกฮูก', rhyme:'ตาโต' },
];

// ─── ข้อมูล A-Z (ตรงกับ learn-abc.html) ───
const EN = [
  { ch:'A', word:'Apple',      snd:'ah'   },
  { ch:'B', word:'Ball',       snd:'buh'  },
  { ch:'C', word:'Cat',        snd:'kuh'  },
  { ch:'D', word:'Dog',        snd:'duh'  },
  { ch:'E', word:'Egg',        snd:'eh'   },
  { ch:'F', word:'Fish',       snd:'fuh'  },
  { ch:'G', word:'Goat',       snd:'guh'  },
  { ch:'H', word:'Hat',        snd:'huh'  },
  { ch:'I', word:'Igloo',      snd:'ih'   },
  { ch:'J', word:'Jellyfish',  snd:'juh'  },
  { ch:'K', word:'Key',        snd:'kuh'  },
  { ch:'L', word:'Lion',       snd:'luh'  },
  { ch:'M', word:'Monkey',     snd:'muh'  },
  { ch:'N', word:'Nest',       snd:'nuh'  },
  { ch:'O', word:'Octopus',    snd:'oh'   },
  { ch:'P', word:'Pig',        snd:'puh'  },
  { ch:'Q', word:'Queen',      snd:'kwuh' },
  { ch:'R', word:'Rabbit',     snd:'ruh'  },
  { ch:'S', word:'Sun',        snd:'sss'  },
  { ch:'T', word:'Tiger',      snd:'tuh'  },
  { ch:'U', word:'Umbrella',   snd:'uh'   },
  { ch:'V', word:'Violin',     snd:'vuh'  },
  { ch:'W', word:'Watermelon', snd:'wuh'  },
  { ch:'X', word:'Box',        snd:'ks'   },
  { ch:'Y', word:'Yo-yo',      snd:'yuh'  },
  { ch:'Z', word:'Zebra',      snd:'zzz'  },
];

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function thaiSsml(d) {
  const text = d.rhyme
    ? `${d.name} ${d.thing} ${d.rhyme}`
    : `${d.name} เอ๋ย ${d.name} ${d.thing}`;
  // rate -25%: ช้าพอให้เด็กฟังตามทัน แต่ยังเป็นธรรมชาติ
  return `<speak version="1.0" xml:lang="th-TH"><voice name="${VOICE_TH}"><prosody rate="-25%">${esc(text)}</prosody></voice></speak>`;
}

function enSsml(d) {
  const text = `${d.ch} says ${d.snd}, ${d.snd}, ${d.word}.`;
  return `<speak version="1.0" xml:lang="en-US"><voice name="${VOICE_EN}"><prosody rate="-15%">${esc(text)}</prosody></voice></speak>`;
}

async function synth(ssml, outPath) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'kids-games-audio-gen',
    },
    body: ssml,
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

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function main() {
  const tasks = [];
  THAI.forEach((d, i) => {
    const idx = String(i + 1).padStart(2, '0');
    tasks.push({
      out: path.join(repoRoot, 'audio/th', `${idx}.mp3`),
      ssml: thaiSsml(d),
      label: `TH ${idx} ${d.ch} ${d.thing}`,
    });
  });
  EN.forEach(d => {
    tasks.push({
      out: path.join(repoRoot, 'audio/en', `${d.ch.toLowerCase()}.mp3`),
      ssml: enSsml(d),
      label: `EN ${d.ch} ${d.word}`,
    });
  });

  let made = 0, skipped = 0, failed = 0;
  for (const t of tasks) {
    const has = await exists(t.out);
    if (has && !FORCE) {
      console.log(`skip  ${t.label}  (exists, use --force to redo)`);
      skipped++;
      continue;
    }
    try {
      const bytes = await synth(t.ssml, t.out);
      console.log(`done  ${t.label}  (${bytes} bytes)`);
      made++;
      // Azure F0: 20 TPS limit — เว้น 100ms กันโดน throttle
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.error(`FAIL  ${t.label}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\nสรุป: สร้างใหม่ ${made} | ข้าม ${skipped} | ผิดพลาด ${failed}`);
  if (failed > 0) process.exit(1);
}

await main();
