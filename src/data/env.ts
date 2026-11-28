import { z } from 'zod';

/**
 * App environment, read from .env (see .env.example) and checked with zod.
 *
 * Usage: import { getEnv } from '@/data/env'; const { supabaseUrl } = getEnv();
 *
 * Anything prefixed EXPO_PUBLIC_ is bundled into the APK and readable by anyone
 * holding it. So this file refuses secret keys outright (CLAUDE.md rule 1), and
 * refuses prod in a dev build (rule 15). Error messages name the variable but
 * never repeat its value.
 */

export type AppEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  sentryDsn: string;
  appEnv: 'dev' | 'prod';
};

const required = (key: string) =>
  z.string({ error: `${key} is missing` }).trim().min(1, { error: `${key} is missing` });

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: required('EXPO_PUBLIC_SUPABASE_URL').regex(
    /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/,
    { error: 'EXPO_PUBLIC_SUPABASE_URL must look like https://<project-ref>.supabase.co' },
  ),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: required('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  EXPO_PUBLIC_SENTRY_DSN: required('EXPO_PUBLIC_SENTRY_DSN').url({
    error: 'EXPO_PUBLIC_SENTRY_DSN must be a URL',
  }),
  EXPO_PUBLIC_APP_ENV: z.enum(['dev', 'prod'], {
    error: 'EXPO_PUBLIC_APP_ENV must be dev or prod',
  }),
});

function fail(problem: string): never {
  throw new Error(
    `ATLAS environment problem: ${problem}. Check .env against .env.example, then restart the dev server with "npx expo start --clear".`,
  );
}

/** Reads the role claim of a legacy Supabase JWT key, or null if it is not one. */
function jwtRole(key: string): string | null {
  const [, middle, ...rest] = key.split('.');
  if (middle === undefined || rest.length !== 1 || !key.startsWith('eyJ')) return null;
  try {
    const payload = middle.replace(/-/g, '+').replace(/_/g, '/');
    const role: unknown = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
      .role;
    return typeof role === 'string' ? role : null;
  } catch {
    return null;
  }
}

function checkKeyIsPublic(key: string) {
  if (key.startsWith('sk-ant')) {
    fail('a Claude API key is in .env. Remove it now. It belongs only in Supabase secrets');
  }
  if (key.startsWith('sb_secret_') || jwtRole(key) === 'service_role') {
    fail(
      'EXPO_PUBLIC_SUPABASE_ANON_KEY is a secret key. Use the publishable (anon) key. A secret key in the app bypasses Row Level Security',
    );
  }
}

/** Pure check, exported for tests. `isDev` is __DEV__ in the app. */
export function parseEnv(raw: Record<string, string | undefined>, isDev: boolean): AppEnv {
  for (const value of Object.values(raw)) {
    if (value?.trim().startsWith('sk-ant')) {
      fail('a Claude API key is in .env. Remove it now. It belongs only in Supabase secrets');
    }
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    fail(result.error.issues.map((issue) => issue.message).join('; '));
  }
  const v = result.data;
  checkKeyIsPublic(v.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  if (v.EXPO_PUBLIC_APP_ENV === 'prod' && isDev) {
    fail('EXPO_PUBLIC_APP_ENV is prod in a dev build. Development uses atlas-dev only (CLAUDE.md rule 15)');
  }

  return {
    supabaseUrl: v.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, ''),
    supabaseAnonKey: v.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    sentryDsn: v.EXPO_PUBLIC_SENTRY_DSN,
    appEnv: v.EXPO_PUBLIC_APP_ENV,
  };
}

/** The project ref, the subdomain of the Supabase URL. Shown on the dev screen to compare with the dashboard. */
export function projectRefFromUrl(url: string): string {
  return new URL(url).hostname.split('.')[0] ?? '';
}

let cached: AppEnv | null = null;

/** The checked environment. Throws on first call if .env is wrong. */
export function getEnv(): AppEnv {
  if (!cached) {
    // Expo inlines EXPO_PUBLIC_ variables only when each is read by its full name.
    cached = parseEnv(
      {
        EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
        EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
      },
      __DEV__,
    );
  }
  return cached;
}
