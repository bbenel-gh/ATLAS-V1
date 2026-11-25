/**
 * Development only (runbook S13): create fake test pupils with codes in
 * atlas-dev, and write a printable code sheet.
 *
 * Usage:
 *   npm run pupils:create -- --class "Test Basic 7A" --names names.csv [--consent]
 *
 *   --class    the class, which must start with "Test ". Used if one class has
 *              that name, created if none has (D-39).
 *   --names    a CSV file, one first name or nickname per line (first column).
 *              Fake names only: atlas-dev never holds real pupils (rule 15).
 *   --consent  also record a dev paper consent for each new pupil, so they can
 *              go past the waiting screen. Leave it off to test the consent gate.
 *
 * What it makes: pupil rows only, each with a unique code and no PIN. The auth
 * user is made by pupil-signin at the pupil's first sign-in, exactly as for a
 * pupil the admin makes on the dashboard (D-36). Every id it makes starts with
 * 7e57c0de, so npm run seed:dev clears them.
 *
 * The sheet goes to content-work/pilot/codes-<class>-<date>.html, which is
 * git-ignored because it holds names. Refuses anything but atlas-dev, and runs
 * through the Supabase CLI login (D-31): no service role key.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { generateUniqueCodes } from '../src/domain/pupilCode.ts';
import {
  assertTestClassName,
  createdPupilId,
  parseNamesCsv,
  renderCodeSheet,
  sheetFileName,
} from './lib/codeSheet.ts';
import { runCliSql } from './lib/cliSql.ts';
import { assertAtlasDev, parseEnvFile, sqlText } from './lib/devTarget.ts';
import { STAFF } from './lib/testFixtures.ts';

const root = join(import.meta.dirname, '..');
const USAGE = 'Usage: npm run pupils:create -- --class "Test Basic 7A" --names names.csv [--consent]';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// 1. Arguments.
const args = process.argv.slice(2);
const valueOf = (flag: string): string | undefined => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const className = valueOf('--class');
const namesPath = valueOf('--names');
const withConsent = args.includes('--consent');
const known = new Set(['--class', '--names', '--consent', className, namesPath]);
if (!className || !namesPath || args.some((a) => !known.has(a))) fail(USAGE);

let names: string[];
try {
  assertTestClassName(className);
  const file = resolve(process.cwd(), namesPath);
  if (!existsSync(file)) fail(`No names file at ${file}`);
  names = parseNamesCsv(readFileSync(file, 'utf8'));
} catch (e) {
  fail((e as Error).message);
}

// 2. atlas-dev only (rule 15).
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

const sheetDir = join(root, 'content-work', 'pilot');
const sheetPath = join(sheetDir, sheetFileName(className, new Date()));
if (existsSync(sheetPath)) fail(`${sheetPath} already exists. Move or delete it first, so no sheet is overwritten.`);

const t = sqlText;
try {
  // 3. The class, and every code already in use.
  const classes = runCliSql(root, ref, `select id::text as id from public.classes where name = ${t(className)};`, 'read');
  if (classes.length > 1) fail(`${classes.length} classes are called "${className}". Use a name that only one class has.`);
  const classId = classes.length === 1 ? String(classes[0]?.id) : createdPupilId(randomBytes);
  const used = runCliSql(
    root,
    ref,
    'select code from public.pupils union select join_code from public.classes where join_code is not null;',
    'read',
  );
  const taken = new Set(used.map((r) => String(r.code)));

  // 4. Codes and ids, then one transaction.
  const codes = generateUniqueCodes(names.length, taken, (n) => new Uint8Array(randomBytes(n)));
  const pupils = names.map((name, i) => ({ id: createdPupilId(randomBytes), name, code: codes[i] ?? '' }));
  const sql = [
    'begin;',
    ...(classes.length === 0 ? [`insert into public.classes (id, name) values (${t(classId)}, ${t(className)});`] : []),
    ...pupils.map(
      (p) => `insert into public.pupils (id, class_id, display_name, code, signed_up_by, class_level, school_id, school_given)
       select ${t(p.id)}, c.id, ${t(p.name)}, ${t(p.code)}, 'admin', c.level, c.school_id, s.name
         from public.classes c left join public.schools s on s.id = c.school_id
        where c.id = ${t(classId)};`,
    ),
    ...(withConsent
      ? pupils.map(
          (p) => `insert into public.consents (pupil_id, method, recorded_by, form_ref)
           values (${t(p.id)}, 'paper', ${t(STAFF.admin.id)}, 'DEV-CREATEPUPILS');`,
        )
      : []),
    'commit;',
  ];
  runCliSql(root, ref, sql.join('\n'), 'write');

  // 5. Read back: every pupil is there, with its code, in the class.
  const ids = pupils.map((p) => `${t(p.id)}::uuid`).join(', ');
  const [check] = runCliSql(
    root,
    ref,
    `select count(*)::int as n, count(*) filter (where class_id = ${t(classId)}::uuid)::int as in_class,
            count(*) filter (where pin_hash is null and user_id is null)::int as fresh
       from public.pupils where id in (${ids});`,
    'read',
  );
  const n = Number(check?.n ?? 0);
  if (n !== pupils.length || Number(check?.in_class) !== n || Number(check?.fresh) !== n) {
    fail(`Read-back did not match: expected ${pupils.length} new pupils in the class, found ${n}. Check atlas-dev.`);
  }

  // 6. The sheet. It holds names, so it is git-ignored and nothing in it loads from the internet.
  mkdirSync(sheetDir, { recursive: true });
  writeFileSync(sheetPath, renderCodeSheet({ className, pupils }));

  console.log(`atlas-dev (${ref}): ${n} test pupils created in "${className}"${classes.length === 0 ? ' (new class)' : ''}.`);
  console.log(withConsent ? '  Consent recorded for each (dev paper form).' : '  No consent: they will see the waiting screen.');
  console.log('  No PIN yet: each pupil chooses one at first sign-in.');
  console.log(`  Code sheet: ${sheetPath}`);
  console.log('  Run npm run seed:dev to remove them again.');
} catch (e) {
  fail(`Nothing was created (the transaction rolled back), or the read-back failed.\n${(e as Error).message}`);
}
