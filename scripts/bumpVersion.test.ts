import { bumpAppConfig, nextVersion } from './bumpVersion';

describe('nextVersion', () => {
  it.each([
    ['0.1.0', 'patch', '0.1.1'],
    ['0.1.9', 'patch', '0.1.10'],
    ['0.1.3', 'minor', '0.2.0'],
    ['0.9.3', 'major', '1.0.0'],
  ] as const)('%s with %s gives %s', (from, kind, to) => {
    expect(nextVersion(from, kind)).toBe(to);
  });

  it('rejects a version that is not x.y.z', () => {
    expect(() => nextVersion('1.0', 'patch')).toThrow('x.y.z');
    expect(() => nextVersion('1.0.0-beta', 'patch')).toThrow('x.y.z');
  });
});

describe('bumpAppConfig', () => {
  const config = {
    expo: {
      name: 'ATLAS',
      version: '0.1.0',
      android: { package: 'com.atlas.learn', versionCode: 1 },
    },
  };

  it('bumps the version and adds 1 to versionCode', () => {
    const out = bumpAppConfig(config, 'patch');
    expect(out.expo.version).toBe('0.1.1');
    expect(out.expo.android.versionCode).toBe(2);
  });

  it('always adds 1 to versionCode, whatever the kind', () => {
    expect(bumpAppConfig(config, 'major').expo.android.versionCode).toBe(2);
  });

  it('keeps every other field', () => {
    const out = bumpAppConfig(config, 'minor');
    expect(out.expo.name).toBe('ATLAS');
    expect(out.expo.android.package).toBe('com.atlas.learn');
  });

  it('does not change the input', () => {
    bumpAppConfig(config, 'patch');
    expect(config.expo.version).toBe('0.1.0');
    expect(config.expo.android.versionCode).toBe(1);
  });

  it('refuses a config without android.versionCode', () => {
    expect(() =>
      bumpAppConfig({ expo: { version: '0.1.0', android: { package: 'x' } } }, 'patch'),
    ).toThrow('versionCode');
  });
});
