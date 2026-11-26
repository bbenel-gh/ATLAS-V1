/**
 * PreToolUse hook for Bash and PowerShell (runbook S14, D-40). Blocks force
 * push, push to main, supabase db reset, anything naming atlas-prod, and
 * rm -rf outside node_modules. Exit 2 blocks the call and tells Claude why.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { bashBlockReason, pushTargetsMain } from '../../scripts/lib/hookRules.ts';

let input: { tool_input?: { command?: unknown }; cwd?: unknown } = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8')) as typeof input;
} catch {
  process.exit(0); // nothing to check
}
const command = typeof input.tool_input?.command === 'string' ? input.tool_input.command : '';
if (!command) process.exit(0);

let reason = bashBlockReason(command);
if (!reason && /\bpush\b/.test(command)) {
  const cwd = typeof input.cwd === 'string' ? input.cwd : process.cwd();
  const branch = spawnSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8' }).stdout?.trim() ?? '';
  if (pushTargetsMain(command, branch)) reason = 'Blocked: this push would go to main (main is checked out). Only Bright merges into main.';
}

if (reason) {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}
