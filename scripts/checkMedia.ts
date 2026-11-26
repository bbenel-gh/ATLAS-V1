/**
 * Checks the lesson media links (runbook S16, specs/video-board.md section 2).
 * Read only: it sends HEAD requests and changes nothing.
 *
 * Usage:
 *   npm run media:check                      every link in content/materials.json
 *   npm run media:check -- --base <url>      the expected file names at a bucket
 *                                            (for example the R2 public link, D-45)
 *
 * Expected names, per video version (overview segment code is OV):
 *   mat-<segment>-<label>-360.mp4, mat-<segment>-<label>-480.mp4,
 *   mat-<segment>-<label>.jpg, mat-<segment>-<label>.vtt
 *
 * Each line says OK or MISSING, with the type and size the server reports.
 * A video must be video/mp4, a poster an image, captions text. Exits 1 if
 * anything is missing or has the wrong type.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Version = { label: string; url360: string; url480: string; posterUrl: string; captionsUrl: string };
type Content = { topic: { overview: Version }; segments: { code: string; versions: Version[] }[] };

const root = join(import.meta.dirname, '..');
const content = JSON.parse(readFileSync(join(root, 'content', 'materials.json'), 'utf8').replace(/^﻿/, '')) as Content;
const baseIndex = process.argv.indexOf('--base');
const base = baseIndex > 0 ? (process.argv[baseIndex + 1] ?? '').replace(/\/+$/, '') : null;
if (base !== null && !/^https:\/\/\S+$/.test(base)) {
  console.error('--base needs a web address starting with https://');
  process.exit(1);
}

type Kind = 'video' | 'poster' | 'captions';
const versions: { name: string; v: Version }[] = [
  { name: 'OV-' + content.topic.overview.label, v: content.topic.overview },
  ...content.segments.flatMap((s) => s.versions.map((v) => ({ name: `${s.code}-${v.label}`, v }))),
];

const checks: { what: string; url: string; kind: Kind }[] = versions.flatMap(({ name, v }) => {
  const file = (suffix: string) => (base ? `${base}/mat-${name}${suffix}` : null);
  return [
    { what: `${name} 360p`, url: file('-360.mp4') ?? v.url360, kind: 'video' as const },
    { what: `${name} 480p`, url: file('-480.mp4') ?? v.url480, kind: 'video' as const },
    { what: `${name} poster`, url: file('.jpg') ?? v.posterUrl, kind: 'poster' as const },
    { what: `${name} captions`, url: file('.vtt') ?? v.captionsUrl, kind: 'captions' as const },
  ];
});

const typeOk = (kind: Kind, type: string) =>
  kind === 'video' ? type.startsWith('video/mp4') : kind === 'poster' ? type.startsWith('image/') : /^text\/(vtt|plain)/.test(type);

async function head(url: string): Promise<{ status: number; type: string; bytes: number | null }> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20_000) });
    const n = Number(res.headers.get('content-length'));
    return { status: res.status, type: res.headers.get('content-type') ?? '', bytes: Number.isFinite(n) && n > 0 ? n : null };
  } catch {
    return { status: 0, type: '', bytes: null };
  }
}

const mb = (n: number | null) => (n === null ? 'size unknown' : `${(n / 1_000_000).toFixed(1)} MB`);

let bad = 0;
const seen = new Map<string, Awaited<ReturnType<typeof head>>>();
console.log(base ? `Expected files at ${base}` : 'Links in content/materials.json');
for (const c of checks) {
  const r = seen.get(c.url) ?? (await head(c.url));
  seen.set(c.url, r);
  const ok = r.status === 200 && typeOk(c.kind, r.type);
  if (!ok) bad += 1;
  const why = r.status === 0 ? 'no answer' : r.status !== 200 ? `HTTP ${r.status}` : `wrong type ${r.type}`;
  console.log(`${ok ? 'OK     ' : 'MISSING'}  ${c.what.padEnd(16)} ${ok ? `${r.type}, ${mb(r.bytes)}` : why}  ${c.url}`);
}
console.log(`\n${checks.length - bad} of ${checks.length} files ready.`);
process.exit(bad > 0 ? 1 : 0);
