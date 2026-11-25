/**
 * Loads content/materials.json into the database (runbook S09, D-34).
 *
 * Usage:
 *   npm run content:import              import to atlas-dev
 *   npm run content:import -- --dry-run show what would change, write nothing
 *   npm run content:import -- --prod    S41 only: needs ATLAS_PROD_REF in .env.import
 *                                       and the typed confirmation "IMPORT TO PROD"
 *
 * Steps:
 *   1. Validate the file with contentSchema. Any error: print it and stop.
 *   2. Check the target. Without --prod it must be atlas-dev (rule 15).
 *   3. Read what the database holds for this topic (read-only query).
 *   4. Plan: rows to insert and update by stable keys (scripts/lib/contentImport.ts).
 *   5. Write only those rows, in one transaction. Nothing is ever deleted.
 *   6. Read again and confirm the database now matches the file.
 *
 * Like the seed (D-31), it runs through the Supabase CLI login, so no service
 * role key is stored on this shared computer. It runs here only, never in the app.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

import { validateContent } from '../src/data/contentSchema.ts';
import {
  buildImportSql,
  buildReadSql,
  formatSummary,
  parseImportArgs,
  planImport,
  prodTarget,
  stableStringify,
  type DbState,
} from './lib/contentImport.ts';
import { assertAtlasDev, parseEnvFile } from './lib/devTarget.ts';

const root = join(import.meta.dirname, '..');

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function chooseTarget(prod: boolean): Promise<string> {
  if (!prod) {
    const appEnv = parseEnvFile(readFileSync(join(root, '.env'), 'utf8'));
    const linkedRefPath = join(root, 'supabase', '.temp', 'project-ref');
    return assertAtlasDev({
      supabaseUrl: appEnv.EXPO_PUBLIC_SUPABASE_URL,
      linkedRef: existsSync(linkedRefPath) ? readFileSync(linkedRefPath, 'utf8') : undefined,
    });
  }
  const envImportPath = join(root, '.env.import');
  const envImport = existsSync(envImportPath) ? parseEnvFile(readFileSync(envImportPath, 'utf8')) : {};
  if (!process.stdin.isTTY) fail('Refusing to import to prod: run it in a terminal where you can type the confirmation.');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const typed = await rl.question('This writes to the PRODUCTION project. Type IMPORT TO PROD to continue: ');
  rl.close();
  return prodTarget(envImport.ATLAS_PROD_REF, typed);
}

/** Runs a SQL file through the CLI. ref is a checked 20-letter ref; the file is our own temp path. */
function runSql(ref: string, sql: string, mode: 'read' | 'write'): string {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-import-'));
  const file = join(dir, `${mode}.sql`);
  try {
    writeFileSync(file, sql, { mode: 0o600 });
    // write: --yes because the CLI asks before any write to a hosted database and
    // calls every main database "production" (D-25). chooseTarget is the real guard.
    const flag = mode === 'read' ? '--read-only' : '--yes';
    const command = `npx supabase db query --remote=${ref} ${flag} -f "${file}" --output-format json`;
    const run = spawnSync(command, { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (run.status !== 0) {
      // Both streams: the CLI puts its "Target" line on stderr and the error JSON on stdout.
      console.error([run.stderr, run.stdout, run.error?.message].filter(Boolean).join('\n'));
      console.error(`CLI exit status: ${String(run.status)}${run.signal ? `, signal ${run.signal}` : ''}`);
      fail(mode === 'read' ? 'Could not read the database.' : 'Import FAILED. Nothing was changed: the transaction rolled back.');
    }
    return run.stdout;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function readState(ref: string, topic: string): DbState {
  const out = runSql(ref, buildReadSql(topic), 'read');
  const start = out.indexOf('{');
  const parsed = JSON.parse(start >= 0 ? out.slice(start) : out) as { rows?: { state?: unknown }[] };
  const state = parsed.rows?.[0]?.state;
  const value = typeof state === 'string' ? (JSON.parse(state) as unknown) : state;
  if (value === null || typeof value !== 'object') fail('The database read returned no content state.');
  return value as DbState;
}

async function main() {
  let args: ReturnType<typeof parseImportArgs>;
  try {
    args = parseImportArgs(process.argv.slice(2));
  } catch (e) {
    fail((e as Error).message);
  }

  // 1. Validate.
  const path = join(root, 'content', 'materials.json');
  let input: unknown;
  try {
    input = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    fail(`content/materials.json is not valid JSON: ${(e as Error).message}`);
  }
  const result = validateContent(input);
  if (!result.ok) {
    console.error(`content/materials.json has ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}. Nothing was imported.`);
    for (const e of result.errors) console.error(`  ${e.path}: ${e.message}`);
    process.exit(1);
  }
  const content = result.content;

  // 2. Target.
  let ref: string;
  try {
    ref = await chooseTarget(args.prod);
  } catch (e) {
    fail((e as Error).message);
  }

  // 3 and 4. Read and plan. The hash is of the validated content, so line endings
  // and spacing in the file do not change the version.
  const hash = createHash('sha256').update(stableStringify(content)).digest('hex').slice(0, 8);
  const today = new Date().toISOString().slice(0, 10);
  const plan = planImport({ content, state: readState(ref, content.topic.id), hash, today });

  console.log(`${args.dryRun ? 'Dry run on' : 'Importing to'} ${args.prod ? 'PRODUCTION' : 'atlas-dev'} (${ref})`);
  for (const line of formatSummary(plan)) console.log(line);
  if (args.dryRun || plan.changes === 0) return;

  // 5. Write.
  runSql(ref, buildImportSql(plan), 'write');

  // 6. Check.
  const after = planImport({ content, state: readState(ref, content.topic.id), hash, today });
  if (after.changes !== 0) {
    for (const line of formatSummary(after)) console.error(line);
    fail('Import wrote rows, but the database still differs from the file (see above).');
  }
  console.log(`Imported and checked: the database now matches the file. Content version ${after.version}.`);
}

void main();
