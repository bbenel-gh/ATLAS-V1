/**
 * Shared guard and helpers for the dev-only scripts (seedDev, rlsTests).
 *
 * CLAUDE.md rule 15: never touch real pupil data or the production project.
 * Every script that writes to or signs in to Supabase calls assertAtlasDev
 * first, and refuses to run unless BOTH the app URL in .env and the project the
 * Supabase CLI is linked to are atlas-dev (D-25).
 *
 * Pure TypeScript with no imports, so it runs under Node type stripping and Jest.
 */

/** atlas-dev, the only project these scripts may touch (D-25). */
export const ATLAS_DEV_REF = 'gygmyjbuzbbngsoyoubg';

export function assertAtlasDev(target: { supabaseUrl: string | undefined; linkedRef: string | undefined }): string {
  const expectedHost = `${ATLAS_DEV_REF}.supabase.co`;
  let host = '';
  let protocol = '';
  try {
    const url = new URL(target.supabaseUrl ?? '');
    host = url.hostname;
    protocol = url.protocol;
  } catch {
    // fall through to the refusal below
  }
  if (protocol !== 'https:' || host !== expectedHost) {
    throw new Error(
      `Refusing to run: EXPO_PUBLIC_SUPABASE_URL must be https://${expectedHost} (atlas-dev). ` +
        'These scripts never run against any other project.',
    );
  }
  const linked = (target.linkedRef ?? '').trim();
  if (linked !== ATLAS_DEV_REF) {
    throw new Error(
      `Refusing to run: the Supabase CLI is linked to "${linked || 'nothing'}", not atlas-dev (${ATLAS_DEV_REF}). ` +
        `Run: npx supabase link --project-ref ${ATLAS_DEV_REF}`,
    );
  }
  return ATLAS_DEV_REF;
}

/** Reads KEY=value lines. Comments and blank lines are skipped. */
export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

/** Sets keys in an env file's text: replaced in place if present, else appended. */
export function setEnvValues(text: string, values: Record<string, string>): string {
  const lines = text === '' ? [] : text.replace(/\r?\n$/, '').split(/\r?\n/);
  const pending = new Map(Object.entries(values));
  const updated = lines.map((line) => {
    const eq = line.indexOf('=');
    if (line.trim().startsWith('#') || eq <= 0) return line;
    const key = line.slice(0, eq).trim();
    const value = pending.get(key);
    if (value === undefined) return line;
    pending.delete(key);
    return `${key}=${value}`;
  });
  for (const [key, value] of pending) updated.push(`${key}=${value}`);
  return updated.length === 0 ? '' : `${updated.join('\n')}\n`;
}

/** A SQL string literal. Refuses backslashes and NULs rather than escaping them. */
export function sqlText(value: string): string {
  if (/[\\\u0000]/.test(value)) {
    throw new Error('sqlText: backslash and NUL are not allowed in seed values');
  }
  return `'${value.replace(/'/g, "''")}'`;
}
