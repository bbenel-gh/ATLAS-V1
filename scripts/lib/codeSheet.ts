/**
 * Pure helpers for scripts/createPupils.ts (runbook S13): the names list, the
 * guards, and the printable code sheet. No I/O here.
 *
 * The sheet holds pupil names, so it loads nothing from the internet and its
 * file name pattern (content-work/pilot/codes-*.html) is git-ignored.
 */
import { isValidCode } from '../../src/domain/auth.ts';

export const PER_PAGE = 12;
const NAME_MAX = 40;
const CLASS_MAX = 80;

/** Ids of pupils made by createPupils start with this, so npm run seed:dev can clear them. */
export const CREATED_PUPIL_ID_PREFIX = '7e57c0de-';

const HEADERS = new Set(['name', 'names', 'first name', 'first_name', 'firstname', 'nickname', 'pupil']);

/** The first field of one CSV line, with double quotes handled ("Kofi, Jr" stays whole). */
function firstField(line: string): string {
  const s = line.trim();
  if (!s.startsWith('"')) return (s.split(',')[0] ?? '').trim();
  let out = '';
  for (let i = 1; i < s.length; i++) {
    const c = s[i];
    if (c === '"') {
      if (s[i + 1] === '"') {
        out += '"';
        i++;
      } else {
        return out.trim();
      }
    } else {
      out += c;
    }
  }
  return out.trim();
}

/** One first name or nickname per line, from the first column. A header row is skipped. */
export function parseNamesCsv(text: string): string[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const names: string[] = [];
  lines.forEach((line, index) => {
    const name = firstField(line);
    if (name === '') return;
    if (names.length === 0 && HEADERS.has(name.toLowerCase())) return;
    if (name.length > NAME_MAX) {
      throw new Error(`Names file line ${index + 1}: a name can be at most ${NAME_MAX} characters.`);
    }
    names.push(name);
  });
  if (names.length === 0) throw new Error('The names file has no names in it.');
  return names;
}

/**
 * CLAUDE.md rule 15: atlas-dev holds fake test pupils only. Real classes are
 * made by the admin on the production dashboard (S34), never by this script.
 */
export function assertTestClassName(name: string): void {
  if (!name.startsWith('Test ') || name.trim().length <= 'Test'.length) {
    throw new Error('The class name must start with "Test " (for example "Test Basic 7A"). This script makes fake test pupils in atlas-dev only.');
  }
  if (name.length > CLASS_MAX) throw new Error(`A class name can be at most ${CLASS_MAX} characters.`);
}

/** A version 4 UUID that starts with 7e57c0de, from 16 random bytes. */
export function createdPupilId(random: (n: number) => Uint8Array): string {
  const b = random(16);
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  const variant = ((parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16);
  return `${CREATED_PUPIL_ID_PREFIX}${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function sheetFileName(className: string, date: Date): string {
  const slug = className
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `codes-${slug}-${date.toISOString().slice(0, 10)}.html`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export type SheetPupil = { name: string; code: string };

/** A4 pages of 12 cards (3 across, 4 down), dashed cut lines, class, first name, code and the keep-safe line. */
export function renderCodeSheet(input: { className: string; pupils: SheetPupil[] }): string {
  for (const p of input.pupils) {
    if (!isValidCode(p.code)) throw new Error(`Not a valid pupil code: ${p.code}`);
  }
  const cls = escapeHtml(input.className);
  const pages: SheetPupil[][] = [];
  for (let i = 0; i < input.pupils.length; i += PER_PAGE) pages.push(input.pupils.slice(i, i + PER_PAGE));

  const card = (p: SheetPupil) => `      <div class="card">
        <div class="cls">${cls}</div>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="code">${p.code}</div>
        <div class="keep">Keep this code. Do not share your PIN.</div>
      </div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Pupil codes: ${cls}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #F2F4F3; color: #16233E; font-family: Inter, Arial, sans-serif; }
  .note { padding: 12px 16px; font-size: 14px; color: #4C566B; }
  .page { width: 190mm; height: 277mm; margin: 0 auto 10mm; background: #FCFCFA;
    display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(4, 1fr);
    page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .card { border: 1px dashed #4C566B; padding: 8mm 5mm; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 4mm; text-align: center; }
  .cls { font-size: 11pt; color: #4C566B; }
  .name { font-size: 15pt; font-weight: 600; word-break: break-word; }
  .code { font-family: "IBM Plex Mono", Consolas, "Courier New", monospace; font-size: 24pt;
    letter-spacing: 3px; font-weight: 600; }
  .keep { font-size: 9.5pt; color: #4C566B; }
  @media print {
    body, .page { background: #FFFFFF; }
    .note { display: none; }
    .page { margin: 0; }
  }
</style>
</head>
<body>
  <p class="note">Print at 100% on A4. Cut along the dashed lines. This sheet holds pupil names: keep it safe and do not share the file.</p>
${pages.map((page) => `  <section class="page">\n${page.map(card).join('\n')}\n  </section>`).join('\n')}
</body>
</html>
`;
}
