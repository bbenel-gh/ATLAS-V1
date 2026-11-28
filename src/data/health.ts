import { getEnv, projectRefFromUrl } from './env';

export type HealthResult = { ok: true; projectRef: string } | { ok: false };

/**
 * Asks the Supabase auth service whether it is up, using the anon key.
 * A real network call, unlike auth.getSession(), which only reads local
 * storage when nobody is signed in. Gives up after 20 seconds (CLAUDE.md rule 5).
 *
 * Usage: const result = await checkSupabaseHealth();
 */
export async function checkSupabaseHealth(): Promise<HealthResult> {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: { apikey: supabaseAnonKey },
      signal: controller.signal,
    });
    return response.ok ? { ok: true, projectRef: projectRefFromUrl(supabaseUrl) } : { ok: false };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
