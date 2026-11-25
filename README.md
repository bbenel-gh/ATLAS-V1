# ATLAS V1

An Android app that teaches one topic: Basic 7 Integrated Science, Diversity of
Matter: Materials. One overview and five segments, 1A to 1E.

It is a pilot release for one class at Detieso D/A Basic School, installed
directly on pilot phones as an APK. It is not a public Play Store release.

Read `CLAUDE.md` before you change anything. It holds the shift protocol, the
role table and the rules that never bend. `DOCS_INDEX.md` says which document
wins when two disagree.

## Running it

You need Node 24.22.3 or newer. On this computer it is at
`C:\ATLAS\tools\node-v24.22.3-win-x64` and already on the user PATH.

```
npm install
npm start
```

Then pick one:

- Press `w` for the browser.
- Press `a` for the Android emulator. The AVD is `atlas_api36`.
- Scan the QR code with Expo Go on an Android phone, on the same network.

### On a phone over USB

1. On the phone: Settings, About phone, tap Build number 7 times. Then in
   Developer options turn on USB debugging.
2. Install Expo Go on the phone from the Play Store.
3. Connect the phone by USB and accept the "Allow USB debugging" prompt.
4. On the computer, check the phone is seen: `adb devices` lists it as `device`.
5. Run `npm run android`. Expo opens the app in Expo Go on the phone. The
   first screen shows "sign-in".

If the phone and computer are not on the same Wi-Fi, run
`adb reverse tcp:8081 tcp:8081` before step 5.

## Checks

All three must pass before any task is called done.

```
npm run typecheck
npm run lint
npm test
```

After any change to `content/materials.json`, run `npm run content:check`. It
prints every error with its JSON path and exits 1 on any error. To check a
copy: `npm run content:check -- path/to/copy.json`.

After any change to `supabase/migrations/`, also run the Row Level Security
suite against atlas-dev. It needs `.env` (atlas-dev URL and anon key) and the
Supabase CLI linked to atlas-dev, and it refuses to run against any other
project.

```
npm run seed:dev    # once, and again after the seed changes. Safe to repeat
npm run test:rls    # every line must say PASS. Any FAIL exits with code 1
```

`seed:dev` creates fake test users and rows (ids start with `7e57`) and writes
their passwords to `.env.test`, which is git ignored. See `.env.test.example`.

## Layout

| Path | Holds |
| --- | --- |
| `app/` | Routes. Expo Router. Not `src/app`, see D-12 in `ops/DECISIONS.md` |
| `src/domain/` | Pure TypeScript rules. No React imports. Fully unit tested |
| `src/data/` | Supabase client, content loader, video cache, offline queue |
| `src/components/` | UI pieces by feature: lesson, board, exam, admin, common |
| `src/theme.ts` | Every colour, font and size. Guarded by `src/theme.test.ts` |
| `supabase/migrations/` | SQL migrations only. Never change the database by hand |
| `supabase/functions/` | Edge Functions. Every Claude API call happens here |
| `content/materials.json` | The topic content, validated by `src/data/contentSchema.ts` |
| `specs/` | The specs. Only Bright may change them |
| `ops/` | Status, handover, decisions, blockers, bugs, rota, shift logs |

Video and audio files never go in the repo. They live in `C:\ATLAS\media` and
on Cloudflare R2.

## Stack

Expo SDK 58, React Native 0.88, React 19.3, TypeScript 6 in strict mode.
Expo Router. Supabase for Postgres, Auth, Storage and Edge Functions. Zustand
for UI state, TanStack Query for server state, zod for validation. Jest for
`src/domain`.
