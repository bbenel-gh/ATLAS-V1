# Shift log: 23 November 2026, shift 1, build operator

Session: S00, repo setup. Branch: `feat/S00-setup`.

One line per finished task, in order.

## Log

1. Read `CLAUDE.md` and `DOCS_INDEX.md`. `ops/STATUS.md` and `ops/HANDOVER.md` did not exist, so there was no previous shift state to summarise.
2. Checked the environment before planning. Found git 2.55.0, JDK 17.0.20, Android SDK with build-tools 36.1.0, platform android-36, NDK and an AVD named `atlas_api36`. Found no Node, no npm and no npx anywhere on the computer.
3. Checked `docs.expo.dev`. Latest stable is Expo SDK 58.0.0 with React Native 0.88, needing Node 22.13+, 24.3+ or 26+. Noted two SDK 58 changes that affect ATLAS: Expo Router now defaults web output to `server`, and `File.write()` in expo-file-system is now async.
4. Proposed the plan and had it approved. Confirmed the person on shift is a build operator, so `specs/`, `content-work/` and `CLAUDE.md` are out of role and became blockers BL-1 to BL-3.
5. Installed Node 24.22.3 LTS from the official zip to `C:\ATLAS\tools`. Verified SHA-256 against `SHASUMS256.txt`: `e612af99f626ab415ea225af6bce5c971feb448cb5cae250bb1c3fa50c5f7d9f`, matched. Added to the user PATH. Logged as D-10.
6. Created the Expo SDK 58 app with `npx create-expo-app@latest --template default`. Confirmed the template puts routes in `src/app`, which takes precedence over a root `app/`, so `src/app` was deleted and routes moved to `app/`. Logged as D-12.
7. Wrote `package.json`, `app.json`, `tsconfig.json`, `jest.config.js`, `.gitignore` and `.env.example`. Set `web.output` to `single`, logged as D-11. Set the Android application id to `com.atlasghana.atlas`, logged as D-13 and flagged for Bright.
8. Wrote `src/theme.ts` with all nine app tokens and all four board tokens from `CLAUDE.md`, and `src/theme.test.ts` to guard every value. Renamed the text-style export from `type` to `typography`, because `import { type }` collides with TypeScript's `import { type Foo }` syntax.
9. Created the folder layout from `CLAUDE.md`, with `.gitkeep` in each empty folder.
10. Wrote `ops/STATUS.md`, `HANDOVER.md`, `DECISIONS.md`, `BLOCKERS.md`, `BUGS.md`, `ROTA.md` and this log.
11. `npm install` failed twice. First `ECONNRESET` partway through, then `ENOSPC`. Found drive C with 3.15 GB free of 107 GB. Reclaimed 1.62 GB by deleting the Node zip and the scaffold temp folder, the partial `node_modules`, which was corrupt after the failed extract, and the npm cache. Reached 4.77 GB free and installed again. Raised as BL-9, because the disk will not hold a Gradle build cache as well.

12. Shift interrupted while `npm install` was still running. Found that `ops/HANDOVER.md` and `ops/STATUS.md` had been written from the plan rather than from checked results, and claimed the packages were installed, the work was committed and the three checks had been run. None of that was true. Both files corrected, with the correction recorded in `HANDOVER.md` so the next shift can see what happened.

## Checks

Blank means not run. Nothing in this table was run during this shift.

| Check | Result | How |
| --- | --- | --- |
| `npm run typecheck` | | |
| `npm run lint` | | |
| `npm test` | | |
| Screen in the browser | | |
| Screen in Expo Go on a phone | | |

## S00 "Done when"

| Line | State | How checked |
| --- | --- | --- |
| Expo app with latest stable SDK, TypeScript strict, Expo Router | | |
| Routes in `app/` at the root, template screens and components deleted | | |
| Named packages installed with `npx expo install` | | |
| Scripts `typecheck`, `lint`, `test`; web output `single` | | |
| `src/theme.ts` with app tokens and board tokens | | |
| `ops/` files created and the 23 Nov decision logged | | |
| One screen showing "ATLAS" in Fraunces on paper | | |
| Git initialised, committed on `feat/S00-setup` | | |
