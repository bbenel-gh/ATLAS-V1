/**
 * Strips pupil fields from anything sent to Sentry.
 *
 * Usage: Sentry.init({ beforeSend: (event) => scrubEvent(event) })
 *
 * Removes every key named name, pin, code, answer or reason (any case, any
 * depth). Sentry's own sdk, os, runtime and browser blocks are left whole:
 * they need `name` and hold no pupil data. device.name is removed, because a
 * phone is often named after its owner.
 *
 * This only removes fields. Free text in error messages is not inspected, so
 * never put a pupil's words or name into an Error message.
 */

const BLOCKED_KEYS = new Set(['name', 'pin', 'code', 'answer', 'reason']);

/** Paths (from the event root) whose contents are Sentry structure, not pupil data. */
const KEEP_WHOLE = new Set(['sdk', 'contexts.os', 'contexts.runtime', 'contexts.browser']);

function scrub(value: unknown, path: string): unknown {
  if (KEEP_WHOLE.has(path)) return value;
  if (Array.isArray(value)) return value.map((item) => scrub(item, `${path}[]`));
  if (value === null || typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (BLOCKED_KEYS.has(key.toLowerCase())) continue;
    out[key] = scrub(child, path ? `${path}.${key}` : key);
  }
  return out;
}

export function scrubEvent<T>(event: T): T {
  return scrub(event, '') as T;
}
