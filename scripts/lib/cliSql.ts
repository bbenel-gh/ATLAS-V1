/**
 * Runs SQL on a hosted Supabase project through the CLI login (D-31), so no
 * service role key is stored on this shared computer. Callers check the target
 * first (assertAtlasDev, or prodTarget in the content import).
 *
 * read:  --read-only, returns the result rows.
 * write: --yes, because the CLI asks before any write to a hosted database and
 *        calls every main database "production" (D-25).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export class CliSqlError extends Error {}

export function runCliSql(root: string, ref: string, sql: string, mode: 'read' | 'write'): Record<string, unknown>[] {
  if (!/^[a-z]{20}$/.test(ref)) throw new CliSqlError('Project ref must be 20 small letters');
  const dir = mkdtempSync(join(tmpdir(), 'atlas-sql-'));
  const file = join(dir, `${mode}.sql`);
  try {
    writeFileSync(file, sql, { mode: 0o600 });
    const flag = mode === 'read' ? '--read-only' : '--yes';
    // One command string: ref is checked above and file is our own temp path.
    const command = `npx supabase db query --remote=${ref} ${flag} -f "${file}" --output-format json`;
    const run = spawnSync(command, { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (run.status !== 0) {
      // Both streams: the CLI puts its "Target" line on stderr and the error JSON on stdout.
      const detail = [run.stderr, run.stdout, run.error?.message].filter(Boolean).join('\n');
      throw new CliSqlError(`Supabase CLI exit status ${String(run.status)}${run.signal ? `, signal ${run.signal}` : ''}\n${detail}`);
    }
    const out = run.stdout;
    const start = out.indexOf('{');
    if (start < 0) return [];
    const parsed = JSON.parse(out.slice(start)) as { rows?: Record<string, unknown>[] };
    return parsed.rows ?? [];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
