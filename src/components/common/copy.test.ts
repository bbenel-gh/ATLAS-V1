import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Guards the copy and colour rules across app/ and src/ (runbook S02 and
 * CLAUDE.md rules 6 and 7):
 * - no exclamation marks in user-facing strings
 * - no em dashes anywhere
 * - no colour hex outside theme.ts, so nothing can add a red, or any colour
 *   that is not a token
 * - no named red colour
 */

const repoRoot = join(__dirname, '..', '..', '..');
const roots = ['app', 'src'].map((dir) => join(repoRoot, dir));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

const files = roots.flatMap(sourceFiles).map((full) => ({
  path: relative(repoRoot, full).replace(/\\/g, '/'),
  text: readFileSync(full, 'utf8'),
}));

/** Every quoted string literal, and JSX text between > and <. */
function userStrings(text: string): string[] {
  const literals = text.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? [];
  const jsxText = (text.match(/>[^<>{}\n]+</g) ?? []).map((s) => s.slice(1, -1));
  return [...literals, ...jsxText];
}

describe('copy and colour rules', () => {
  it('finds the source files', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [f.path, f.text]))('%s has no exclamation mark in copy', (_, text) => {
    const bad = userStrings(text).filter((s) => s.includes('!'));
    expect(bad).toEqual([]);
  });

  it.each(files.map((f) => [f.path, f.text]))('%s has no em dash', (_, text) => {
    expect(text.includes('—')).toBe(false);
  });

  it.each(files.filter((f) => !f.path.endsWith('common/theme.ts')).map((f) => [f.path, f.text]))(
    '%s takes colours from the theme only',
    (_, text) => {
      expect(text.match(/#[0-9A-Fa-f]{3,8}\b/g) ?? []).toEqual([]);
      expect(text.match(/['"](red|crimson|darkred|tomato)['"]/gi) ?? []).toEqual([]);
    },
  );
});
