/**
 * Board video generator (D-47, specs/video-board.md section 2). Builds one
 * video version from its script file, entirely on this computer:
 *
 *   npm run video:make -- OV-a
 *
 * Reads   content-work/scripts/video/mat-<version>.json
 * Writes  C:\ATLAS\media\out\mat-<version>-360.mp4, -480, -720, -1080,
 *         mat-<version>.jpg (first frame) and mat-<version>.vtt
 *
 * Voice: the offline Windows voice (scripts/video/tts.ps1), a stand-in until
 * the voice-over artist records. Board: handwriting in Caveat 700 on the
 * board colour, each line written left to right in time with its sentence,
 * a quiet pen sound while writing, no music. Captions are not burned in; the
 * app shows them under the board from the .vtt (P7).
 * Video files never go in the repo.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { GlobalFonts, createCanvas } from '@napi-rs/canvas';
import { z } from 'zod';

import { parseVtt } from '../src/domain/vtt.ts';
import { buildTimeline, captionCues, toUnits, toVtt, writeProgress, type Timeline, type Word } from './lib/videoTimeline.ts';

const require = createRequire(import.meta.url);
const FFMPEG = require('ffmpeg-static') as string;

const BOARD = '#F6F0E6';
const BOARD_INK = '#1C2740';
const FPS = 25;
const W = 1728;
const H = 1080; // 16:10
const OUTPUTS = [
  { q: '360', w: 576, h: 360, v: '420k', a: '64k' },
  { q: '480', w: 768, h: 480, v: '430k', a: '64k' },
  { q: '720', w: 1152, h: 720, v: '900k', a: '96k' },
  { q: '1080', w: 1728, h: 1080, v: '1500k', a: '96k' },
] as const;

const root = join(import.meta.dirname, '..');
const version = process.argv[2] ?? '';
if (!/^(OV|1[A-E])-[a-z]$/.test(version)) {
  console.error('Give a version, for example: npm run video:make -- OV-a');
  process.exit(1);
}

const copy = z
  .string()
  .min(1)
  .refine((s) => !/[!\u2014]/.test(s), 'no exclamation marks or em dashes (CLAUDE.md rule 7)');
const ScriptFile = z.object({
  version: z.literal(version),
  pages: z.array(z.array(z.object({ board: copy, say: copy })).min(1).max(4)).min(1),
});
const scriptPath = join(root, 'content-work', 'scripts', 'video', `mat-${version}.json`);
const script = ScriptFile.parse(JSON.parse(readFileSync(scriptPath, 'utf8').replace(/^\uFEFF/, '')));

const media = 'C:\\ATLAS\\media';
const build = join(media, 'build', version);
const out = join(media, 'out');
mkdirSync(build, { recursive: true });
mkdirSync(out, { recursive: true });

// 1. Voice and word timings.
const units = toUnits(script);
writeFileSync(join(build, 'lines.json'), JSON.stringify(units.map((u) => u.text)));
const voiceWav = join(build, 'voice.wav');
const wordsPath = join(build, 'words.json');
console.log(`Voice: ${units.length} sentences`);
execFileSync(
  'powershell',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts', 'video', 'tts.ps1'), '-In', join(build, 'lines.json'), '-Wav', voiceWav, '-Words', wordsPath],
  { stdio: 'inherit' },
);
const rawWords = JSON.parse(readFileSync(wordsPath, 'utf8').replace(/^\uFEFF/, '')) as Word | Word[];
const words = Array.isArray(rawWords) ? rawWords : [rawWords];

const wav = readFileSync(voiceWav);
const dataAt = wav.indexOf('data');
const sampleRate = wav.readUInt32LE(24);
const audioSeconds = wav.readUInt32LE(dataAt + 4) / (sampleRate * 2);
const timeline = buildTimeline(script, words, audioSeconds);
const cues = captionCues(script, words, audioSeconds);

// 2. Captions.
const vtt = toVtt(cues);
if (parseVtt(vtt).length !== cues.length) throw new Error('The captions file did not read back.');
writeFileSync(join(out, `mat-${version}.vtt`), vtt);

// 3. Pen sound: quiet, soft scratching while a line is being written.
const penWav = join(build, 'pen.wav');
writeFileSync(penWav, penSound(timeline, sampleRate));

// 4. Board frames piped into one ffmpeg run that writes every size.
const fontPath = join(root, 'node_modules', '@expo-google-fonts', 'caveat', '700Bold', 'Caveat_700Bold.ttf');
if (!existsSync(fontPath)) throw new Error(`Font not found: ${fontPath}`);
GlobalFonts.registerFromPath(fontPath, 'Caveat');

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const FONT_SIZE = 128;
const LEFT = 150;
const TOP = 210;
const LINE_GAP = 210;

const layout = timeline.lines.map((l) => {
  let size = FONT_SIZE;
  ctx.font = `700 ${size}px Caveat`;
  while (ctx.measureText(l.board).width > W - LEFT * 2 && size > 60) {
    size -= 4;
    ctx.font = `700 ${size}px Caveat`;
  }
  const row = script.pages[l.page]!.findIndex((x) => x.board === l.board && x.say === l.say);
  return { size, width: ctx.measureText(l.board).width, y: TOP + row * LINE_GAP };
});

function drawFrame(t: number): Buffer {
  ctx.globalAlpha = 1;
  ctx.fillStyle = BOARD;
  ctx.fillRect(0, 0, W, H);
  // The page on show, fading out for 0.4 s when the next page starts.
  let page = 0;
  for (let p = 0; p < timeline.pages.length; p++) if (t >= timeline.pages[p]!.start) page = p;
  const next = timeline.pages[page + 1];
  const turnStart = timeline.pages[page]!.start;
  let show = page;
  let alpha = 1;
  if (page > 0 && t < turnStart + 0.4) {
    show = page - 1;
    alpha = 1 - (t - turnStart) / 0.4;
  }
  void next;
  ctx.fillStyle = BOARD_INK;
  ctx.textBaseline = 'alphabetic';
  timeline.lines.forEach((l, i) => {
    if (l.page !== show) return;
    const p = show === page ? writeProgress(l, t) : 1;
    if (p <= 0) return;
    const { size, width, y } = layout[i]!;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.rect(LEFT - 20, y - size, (width + 40) * p, size * 1.5);
    ctx.clip();
    ctx.font = `700 ${size}px Caveat`;
    ctx.fillText(l.board, LEFT, y);
    ctx.restore();
  });
  return Buffer.from(ctx.getImageData(0, 0, W, H).data.buffer);
}

const splitLabels = OUTPUTS.map((_, i) => `[v${i}]`).join('');
const filter = [
  `[0:v]split=${OUTPUTS.length}${splitLabels}`,
  ...OUTPUTS.map((o, i) => `[v${i}]scale=${o.w}:${o.h}:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv,format=yuv420p[o${i}]`),
  `[1:a][2:a]amix=inputs=2:normalize=0,aresample=44100,asplit=${OUTPUTS.length}${OUTPUTS.map((_, i) => `[a${i}]`).join('')}`,
].join(';');
const args = [
  '-y', '-loglevel', 'error',
  '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', 'pipe:0',
  '-i', voiceWav,
  '-i', penWav,
  '-filter_complex', filter,
  ...OUTPUTS.flatMap((o, i) => [
    '-map', `[o${i}]`, '-map', `[a${i}]`,
    '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-profile:v', 'main',
    '-b:v', o.v, '-maxrate', o.v, '-bufsize', '2M', '-g', String(FPS * 2),
    // Tagged BT.709 so every phone decodes the board to the same colour (spec section 2 item 2).
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', o.a, '-ac', '1',
    '-movflags', '+faststart',
    join(out, `mat-${version}-${o.q}.mp4`),
  ]),
];

const frames = Math.ceil(timeline.duration * FPS);
console.log(`Board: ${timeline.lines.length} lines on ${timeline.pages.length} pages, ${timeline.duration.toFixed(1)} s, ${frames} frames`);
const ff = spawn(FFMPEG, args, { stdio: ['pipe', 'inherit', 'inherit'] });
const done = new Promise<number>((resolve) => ff.on('close', (code) => resolve(code ?? 1)));
for (let f = 0; f < frames; f++) {
  const frame = drawFrame(f / FPS);
  if (!ff.stdin.write(frame)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % (FPS * 10) === 0) process.stdout.write(`  ${Math.round(f / FPS)} s\r`);
}
ff.stdin.end();
if ((await done) !== 0) throw new Error('ffmpeg could not make the videos.');

// 5. Poster (first frame) and the board colour as decoded from the 360p file.
const v360 = join(out, `mat-${version}-360.mp4`);
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', join(out, `mat-${version}-1080.mp4`), '-frames:v', '1', '-q:v', '3', join(out, `mat-${version}.jpg`)]);
const px = execFileSync(FFMPEG, ['-loglevel', 'error', '-ss', '0.1', '-i', v360, '-frames:v', '1', '-vf', 'crop=2:2:8:8,scale=in_color_matrix=bt709:in_range=tv:flags=accurate_rnd+full_chroma_int,format=rgb24', '-f', 'rawvideo', 'pipe:1']);
const sampled = '#' + [...px.subarray(0, 3)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

console.log(`\nDone: mat-${version}, ${timeline.duration.toFixed(1)} s, ${cues.length} caption cues`);
for (const o of OUTPUTS) {
  const size = readFileSync(join(out, `mat-${version}-${o.q}.mp4`)).length;
  console.log(`  ${o.q.padStart(4)}p  ${(size / 1_000_000).toFixed(1)} MB`);
}
console.log(`  board colour in the decoded video: ${sampled} (made with ${BOARD})`);
console.log(`  files in ${out}`);

/** 16-bit mono WAV: very quiet filtered noise with a stroke rhythm, only while writing. */
function penSound(t: Timeline, rate: number): Buffer {
  const n = Math.ceil(t.duration * rate);
  const samples = new Int16Array(n);
  let seed = 7;
  let low = 0;
  for (const l of t.lines) {
    const a = Math.floor(l.writeStart * rate);
    const b = Math.min(n, Math.floor(l.writeEnd * rate));
    for (let i = a; i < b; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const white = seed / 0x3fffffff - 1;
      low += 0.35 * (white - low);
      const stroke = 0.5 + 0.5 * Math.sin((2 * Math.PI * (i - a)) / (rate * 0.18));
      const fade = Math.min(1, (i - a) / (rate * 0.05), (b - i) / (rate * 0.05));
      samples[i] = Math.round((white - low) * stroke * fade * 0.025 * 32767);
    }
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + n * 2, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(n * 2, 40);
  return Buffer.concat([header, Buffer.from(samples.buffer)]);
}
