/**
 * Checks content/materials.json against src/data/contentSchema.ts (runbook S08).
 *
 * Usage: npm run content:check            (checks content/materials.json)
 *        npm run content:check -- <file>  (checks another file, for example a copy)
 *
 * Prints every error with its JSON path in plain English and exits 1 on any
 * error. Runs directly with Node 24 type stripping.
 */
import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { validateContent } from '../src/data/contentSchema.ts';

const root = join(import.meta.dirname, '..');
const file = process.argv[2] ? resolve(process.argv[2]) : join(root, 'content', 'materials.json');
const name = relative(process.cwd(), file) || file;

let raw: string;
try {
  raw = readFileSync(file, 'utf8');
} catch {
  console.error(`Cannot read ${name}. Check the file exists.`);
  process.exit(1);
}

let data: unknown;
try {
  data = JSON.parse(raw.replace(/^﻿/, ''));
} catch (err) {
  console.error(`${name} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  console.error('Look for a missing comma or quote near that position.');
  process.exit(1);
}

const result = validateContent(data);
if (result.ok) {
  const c = result.content;
  const videos = 1 + c.segments.reduce((n, s) => n + s.versions.length, 0);
  const drafts = (raw.match(/"DRAFT:/g) ?? []).length;
  console.log(`${name} is valid.`);
  console.log(`  Topic ${c.topic.id}: ${c.topic.title}`);
  console.log(`  ${c.segments.length} segments (${c.segments.map((s) => s.code).join(', ')}), ${videos} videos including the overview`);
  console.log(`  ${c.segments.length * 3} check questions, Paper A and Paper B, ${c.recheck.length} re-check items`);
  if (drafts > 0) console.log(`  Note: ${drafts} texts still start with "DRAFT:". Not ready for pupils.`);
  process.exit(0);
}

console.error(`${name} has ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}:\n`);
for (const e of result.errors) console.error(`  ${e.path}\n    ${e.message}\n`);
process.exit(1);
