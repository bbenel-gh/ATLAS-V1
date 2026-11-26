/**
 * Pure rules for the Claude Code hooks in .claude/hooks/ (runbook S14, D-40).
 * No imports, so Node runs it directly and Jest tests it.
 *
 * These are guardrails for a shared computer, not a security boundary: a
 * determined person can always go around them in their own terminal.
 */

/** Split a shell line into simple commands at && || ; | and newlines. */
function segments(command: string): string[] {
  return command
    .split(/&&|\|\||[;|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Words of one simple command, with surrounding quotes removed. */
function words(segment: string): string[] {
  return (segment.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((w) => w.replace(/^["']|["']$/g, ''));
}

/** The arguments after "git ... push", or null if this is not a push. */
function pushArgs(segment: string): string[] | null {
  const w = words(segment);
  const g = w.findIndex((x) => x === 'git' || x.endsWith('/git') || x.endsWith('git.exe'));
  if (g < 0) return null;
  const p = w.indexOf('push', g + 1);
  return p < 0 ? null : w.slice(p + 1);
}

const refIsMain = (ref: string) => {
  const dest = ref.includes(':') ? ref.slice(ref.lastIndexOf(':') + 1) : ref;
  return dest === 'main' || dest === 'refs/heads/main';
};

function isRecursiveForceRemove(segment: string): boolean {
  const w = words(segment);
  if (w[0] === 'rm') {
    const flags = w.slice(1).filter((x) => x.startsWith('-'));
    const short = flags.filter((f) => !f.startsWith('--')).join('');
    const r = /r|R/.test(short) || flags.includes('--recursive');
    const f = short.includes('f') || flags.includes('--force');
    return r && f;
  }
  if (/^remove-item$/i.test(w[0] ?? '')) {
    return w.some((x) => /^-recurse$/i.test(x));
  }
  return false;
}

function removeTargets(segment: string): string[] {
  return words(segment)
    .slice(1)
    .filter((x) => !x.startsWith('-'));
}

const insideNodeModules = (target: string) => target.replace(/\\/g, '/').split('/').includes('node_modules');

/** Why this command is refused, or null if it may run. */
export function bashBlockReason(command: string): string | null {
  if (/atlas-prod/i.test(command)) {
    return 'Blocked: the command mentions atlas-prod. Claude Code never touches the production project (CLAUDE.md rule 15).';
  }
  for (const seg of segments(command)) {
    if (/\bsupabase\s+db\s+reset\b/.test(seg)) {
      return 'Blocked: supabase db reset wipes a database. Never run it from Claude Code. CI resets its own throwaway local stack.';
    }
    const args = pushArgs(seg);
    if (args) {
      if (args.some((a) => a === '--force' || a === '-f' || a.startsWith('--force-with-lease') || /^-[a-zA-Z]*f/.test(a) || a.startsWith('+'))) {
        return 'Blocked: force push. Published history is never rewritten (D-19).';
      }
      if (args.filter((a) => !a.startsWith('-')).some(refIsMain)) {
        return 'Blocked: push to main. Only Bright merges into main, through a pull request.';
      }
    }
    if (isRecursiveForceRemove(seg)) {
      const targets = removeTargets(seg);
      if (targets.length === 0 || !targets.every(insideNodeModules)) {
        return 'Blocked: rm -rf outside node_modules. Delete specific files instead, or ask the person to do it.';
      }
    }
  }
  return null;
}

/** A push with no branch named, run while main is checked out, would push main. */
export function pushTargetsMain(command: string, currentBranch: string): boolean {
  if (currentBranch !== 'main') return false;
  return segments(command).some((seg) => {
    const args = pushArgs(seg);
    if (!args) return false;
    const positional = args.filter((a) => !a.startsWith('-'));
    // git push [remote] [refspec...]: no refspec means the current branch.
    return positional.length <= 1;
  });
}

/** CLAUDE.md (any copy) and anything under specs/ in the project: Bright only. */
export function isBrightOnlyPath(filePath: string, projectDir: string): boolean {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const file = norm(filePath);
  if (file.split('/').pop() === 'claude.md') return true;
  const root = norm(projectDir);
  const rel = file.startsWith(`${root}/`) ? file.slice(root.length + 1) : file;
  return rel.startsWith('specs/');
}

/** Text the person typed in one transcript entry, or '' (tool results, assistant turns and reminders excluded). */
function typedText(entry: unknown): string {
  if (typeof entry !== 'object' || entry === null) return '';
  const e = entry as { type?: unknown; message?: { role?: unknown; content?: unknown } };
  if (e.type !== 'user' || e.message?.role !== 'user') return '';
  const c = e.message.content;
  let text = '';
  if (typeof c === 'string') text = c;
  else if (Array.isArray(c)) {
    text = c
      .filter((b): b is { type: string; text: string } => typeof b === 'object' && b !== null && (b as { type?: unknown }).type === 'text')
      .map((b) => String(b.text))
      .join('\n');
  }
  return text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '');
}

/**
 * True when the person typed "I am Bright" in this conversation. The transcript
 * format belongs to Claude Code and may change; anything unreadable counts as
 * not said, so the edit is blocked (safe side).
 */
export function saidIAmBright(transcriptJsonl: string): boolean {
  for (const line of transcriptJsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (/\bI am Bright\b/i.test(typedText(entry))) return true;
  }
  return false;
}
