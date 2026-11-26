/**
 * PreToolUse hook for Edit, Write, MultiEdit and NotebookEdit (runbook S14,
 * D-40). CLAUDE.md and specs/ belong to Bright: an edit is blocked unless the
 * person typed "I am Bright" in this conversation.
 */
import { existsSync, readFileSync } from 'node:fs';

import { isBrightOnlyPath, saidIAmBright } from '../../scripts/lib/hookRules.ts';

type Input = {
  tool_input?: { file_path?: unknown; notebook_path?: unknown };
  transcript_path?: unknown;
  cwd?: unknown;
};
let input: Input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8')) as Input;
} catch {
  process.exit(0);
}
const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (typeof target !== 'string') process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? (typeof input.cwd === 'string' ? input.cwd : process.cwd());
if (!isBrightOnlyPath(target, projectDir)) process.exit(0);

const transcriptPath = typeof input.transcript_path === 'string' ? input.transcript_path : '';
const transcript = transcriptPath && existsSync(transcriptPath) ? readFileSync(transcriptPath, 'utf8') : '';
if (saidIAmBright(transcript)) process.exit(0);

process.stderr.write(
  'Blocked: CLAUDE.md and specs/ are Bright only. Bright starts the message with "I am Bright" to change them. ' +
    'Otherwise log the needed change in ops/BLOCKERS.md.\n',
);
process.exit(2);
