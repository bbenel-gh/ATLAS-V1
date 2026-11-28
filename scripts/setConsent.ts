/**
 * Development only (runbook S12): record or withdraw consent for a fake test
 * pupil in atlas-dev, so the consent gate can be tested on a phone. The admin
 * dashboard does this properly in S34.
 *
 * Usage:
 *   npm run consent:set -- --code TEST-P3 --on    record a paper consent
 *   npm run consent:set -- --code TESTPC --off    withdraw every active consent
 *
 * Refuses anything but atlas-dev (rule 15) and anything but the four fake test
 * pupils. Runs through the Supabase CLI login (D-31): no service role key.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { runCliSql } from './lib/cliSql.ts';
import { assertAtlasDev, parseEnvFile, sqlText } from './lib/devTarget.ts';
import { PUPIL_LIST, STAFF } from './lib/testFixtures.ts';

const root = join(import.meta.dirname, '..');

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2);
const codeIndex = args.indexOf('--code');
const wanted = codeIndex >= 0 ? (args[codeIndex + 1] ?? '').toUpperCase() : '';
const on = args.includes('--on');
const off = args.includes('--off');
const known = new Set(['--code', '--on', '--off', wanted, args[codeIndex + 1]]);
const unknown = args.filter((a) => !known.has(a));
if (!wanted || on === off || unknown.length > 0) {
  fail('Usage: npm run consent:set -- --code TEST-P3 --on   (or --off). Test pupils only: TEST-P1 to TEST-P4, or codes TESTPA to TESTPD.');
}

const pupil = PUPIL_LIST.find((p) => p.user.label === wanted || p.code === wanted);
if (!pupil) fail(`"${wanted}" is not a test pupil. This script only touches TEST-P1 to TEST-P4 (codes TESTPA to TESTPD).`);

const env = parseEnvFile(readFileSync(join(root, '.env'), 'utf8'));
const linkedRefPath = join(root, 'supabase', '.temp', 'project-ref');
let ref: string;
try {
  ref = assertAtlasDev({
    supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL,
    linkedRef: existsSync(linkedRefPath) ? readFileSync(linkedRefPath, 'utf8') : undefined,
  });
} catch (e) {
  fail((e as Error).message);
}

const id = sqlText(pupil.id);
const sql = on
  ? `insert into public.consents (pupil_id, method, recorded_by, form_ref)
     select ${id}, 'paper', ${sqlText(STAFF.admin.id)}, 'DEV-SETCONSENT'
      where not exists (select 1 from public.consents where pupil_id = ${id} and withdrawn_at is null);`
  : `update public.consents set withdrawn_at = now() where pupil_id = ${id} and withdrawn_at is null;`;

try {
  runCliSql(root, ref, sql, 'write');
  const [state] = runCliSql(
    root,
    ref,
    `select count(*) filter (where withdrawn_at is null)::int as active, count(*)::int as total
       from public.consents where pupil_id = ${id};`,
    'read',
  );
  const active = Number(state?.active ?? 0);
  console.log(`${pupil.user.label} (${pupil.code}) on atlas-dev: consent ${active > 0 ? 'ON' : 'OFF'} (${active} active, ${Number(state?.total ?? 0)} on record).`);
  if (active > 0 !== on) fail('The change did not take. Check the output above.');
  console.log(on ? 'On the phone, tap "Check again".' : 'The pupil sees the waiting screen from the next check (reopen the app or tap "Check again").');
} catch (e) {
  fail((e as Error).message);
}
