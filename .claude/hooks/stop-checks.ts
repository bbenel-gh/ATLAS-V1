/**
 * Stop hook (runbook S14, D-40): before Claude finishes a reply, run
 * typecheck and lint. On failure, Claude is told to keep going and fix it.
 * When Claude is already continuing because of this hook, it stays quiet, so
 * it can never loop.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let input: { stop_hook_active?: unknown; cwd?: unknown } = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8')) as typeof input;
} catch {
  // run the checks anyway
}
if (input.stop_hook_active === true) process.exit(0);

const cwd = process.env.CLAUDE_PROJECT_DIR ?? (typeof input.cwd === 'string' ? input.cwd : process.cwd());
const failures: string[] = [];
for (const script of ['typecheck', 'lint']) {
  // shell: true so Windows finds npm.cmd. The script names are fixed.
  const run = spawnSync(`npm run ${script}`, { cwd, shell: true, encoding: 'utf8', timeout: 240_000 });
  if (run.status !== 0) {
    const out = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.trim().split(/\r?\n/).slice(-30).join('\n');
    failures.push(`npm run ${script} failed:\n${out}`);
  }
}

if (failures.length > 0) {
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason: `${failures.join('\n\n')}\n\nFix these before finishing (CLAUDE.md workflow step 3).`,
    }),
  );
}
process.exit(0);
