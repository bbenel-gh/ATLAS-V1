/**
 * Bumps the app version and the Android versionCode together in app.json.
 *
 * Usage: npm run version:bump -- patch   (or minor, or major)
 *
 * The version (x.y.z) is what people see. versionCode is what Android uses to
 * decide an APK is newer, so it goes up by 1 on every bump, whatever the kind.
 * eas.json uses "appVersionSource": "local", so app.json is the only source.
 *
 * Runs directly with Node 24 type stripping, so it uses only plain TypeScript.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type BumpKind = 'patch' | 'minor' | 'major';

type AppConfig = {
  expo: {
    version: string;
    android: { versionCode?: number; [key: string]: unknown };
    [key: string]: unknown;
  };
};

export function nextVersion(version: string, kind: BumpKind): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Version "${version}" is not x.y.z`);
  }
  const [major, minor, patch] = match.slice(1).map(Number) as [number, number, number];
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function bumpAppConfig<T extends AppConfig>(config: T, kind: BumpKind): T {
  const code = config.expo.android.versionCode;
  if (typeof code !== 'number' || !Number.isInteger(code) || code < 1) {
    throw new Error('app.json has no valid expo.android.versionCode');
  }
  return {
    ...config,
    expo: {
      ...config.expo,
      version: nextVersion(config.expo.version, kind),
      android: { ...config.expo.android, versionCode: code + 1 },
    },
  };
}

function main() {
  const kind = process.argv[2];
  if (kind !== 'patch' && kind !== 'minor' && kind !== 'major') {
    console.error('Usage: npm run version:bump -- patch|minor|major');
    process.exit(1);
  }
  const path = join(process.cwd(), 'app.json');
  const before = JSON.parse(readFileSync(path, 'utf8')) as AppConfig;
  const after = bumpAppConfig(before, kind);
  writeFileSync(path, `${JSON.stringify(after, null, 2)}\n`);
  console.log(
    `Version ${before.expo.version} to ${after.expo.version}, versionCode ${before.expo.android.versionCode} to ${after.expo.android.versionCode}`,
  );
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/bumpVersion.ts')) {
  main();
}
