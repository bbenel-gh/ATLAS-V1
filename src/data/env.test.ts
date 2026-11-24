import { parseEnv, projectRefFromUrl } from './env';

const good = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_abc123DEF456',
  EXPO_PUBLIC_SENTRY_DSN: 'https://public@o123.ingest.sentry.io/456',
  EXPO_PUBLIC_APP_ENV: 'dev',
};

/** A fake JWT with the given role in its payload. Not a real key. */
function fakeJwt(role: string): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ role })}.signature`;
}

describe('parseEnv', () => {
  it('accepts a complete dev environment', () => {
    expect(parseEnv(good, true)).toEqual({
      supabaseUrl: good.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: good.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      sentryDsn: good.EXPO_PUBLIC_SENTRY_DSN,
      appEnv: 'dev',
    });
  });

  it.each([
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_SENTRY_DSN',
    'EXPO_PUBLIC_APP_ENV',
  ])('throws a clear error naming %s when it is missing', (key) => {
    const raw: Record<string, string | undefined> = { ...good, [key]: undefined };
    expect(() => parseEnv(raw, true)).toThrow(key);
    expect(() => parseEnv(raw, true)).toThrow('.env');
  });

  it('treats an empty value as missing', () => {
    expect(() => parseEnv({ ...good, EXPO_PUBLIC_SENTRY_DSN: '' }, true)).toThrow(
      'EXPO_PUBLIC_SENTRY_DSN',
    );
  });

  it('refuses prod while running a dev build', () => {
    expect(() => parseEnv({ ...good, EXPO_PUBLIC_APP_ENV: 'prod' }, true)).toThrow(/prod/);
  });

  it('allows prod in a release build', () => {
    expect(parseEnv({ ...good, EXPO_PUBLIC_APP_ENV: 'prod' }, false).appEnv).toBe('prod');
  });

  it('rejects an app env other than dev or prod', () => {
    expect(() => parseEnv({ ...good, EXPO_PUBLIC_APP_ENV: 'staging' }, true)).toThrow(
      'EXPO_PUBLIC_APP_ENV',
    );
  });

  it('rejects a Supabase URL that is not https on supabase.co', () => {
    for (const url of ['http://abc.supabase.co', 'https://example.com', 'not a url']) {
      expect(() => parseEnv({ ...good, EXPO_PUBLIC_SUPABASE_URL: url }, true)).toThrow(
        'EXPO_PUBLIC_SUPABASE_URL',
      );
    }
  });

  it('accepts a legacy anon JWT', () => {
    const key = fakeJwt('anon');
    expect(parseEnv({ ...good, EXPO_PUBLIC_SUPABASE_ANON_KEY: key }, true).supabaseAnonKey).toBe(key);
  });

  // Anything prefixed EXPO_PUBLIC_ is bundled into the APK. A secret key there
  // would give anyone holding the APK full database access, bypassing RLS.
  it('refuses a secret key', () => {
    expect(() =>
      parseEnv({ ...good, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_abc123' }, true),
    ).toThrow(/secret/);
  });

  it('refuses a service_role JWT', () => {
    expect(() =>
      parseEnv({ ...good, EXPO_PUBLIC_SUPABASE_ANON_KEY: fakeJwt('service_role') }, true),
    ).toThrow(/secret/);
  });

  it('refuses a Claude API key anywhere', () => {
    expect(() =>
      parseEnv({ ...good, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sk-ant-api03-abc' }, true),
    ).toThrow(/Claude/);
  });

  it('never puts a value in an error message', () => {
    try {
      parseEnv({ ...good, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_SHOULD_NOT_APPEAR' }, true);
      throw new Error('expected parseEnv to throw');
    } catch (e) {
      expect(String(e)).not.toContain('SHOULD_NOT_APPEAR');
    }
  });
});

describe('projectRefFromUrl', () => {
  it('reads the project ref from the Supabase URL', () => {
    expect(projectRefFromUrl('https://abcdefghijklmnopqrst.supabase.co')).toBe('abcdefghijklmnopqrst');
  });
});
