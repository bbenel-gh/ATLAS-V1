# Shift log: 23 November 2026, shift 2, build operator

Person: not yet given, to be filled in.
Shift goal: not yet given. Taken to be "finish S00", from `ops/HANDOVER.md`.
Session: S00, repo setup, carried over from shift 1. Branch: `feat/S00-setup`, not yet created.

One line per finished task, in order.

## Log

1. Read `ops/STATUS.md` and `ops/HANDOVER.md`. Found both overstated what shift 1 had done: they claimed the packages were installed, the work was committed on `feat/S00-setup`, and that `typecheck`, `lint` and `test` had been run. Checked the disk instead of trusting the files. There is no `package-lock.json`, no `node_modules/expo` and no `.git`, and no check has ever been run. Rewrote both files to match reality and recorded the correction inside `HANDOVER.md`.
2. Confirmed `npm install` from shift 1 is still alive, process 21912, started 18:18:50. Read the npm debug log and found tarball fetches taking 316 to 320 seconds each, caused by the `maxsockets=4` setting chosen in shift 1 after an `ECONNRESET`. Decided to let it finish rather than restart, because a restart discards the 318 packages already extracted while keeping only the 300 MB npm cache.

3. `npm install` finished, exit 0, 546 packages in 18 minutes. Verified the versions on disk rather than from `package.json`: expo 58.0.26, expo-router 58.0.32, react-native 0.88.1, react 19.3.0, typescript 6.0.3. Confirmed `src/app` does not exist and `app/` holds `index.tsx` and `_layout.tsx`, so Expo Router will use the root folder as CLAUDE.md requires.
4. Installed the remaining packages with `npx expo install`, which resolved 5 SDK 58 native modules (AsyncStorage, expo-video, expo-file-system, expo-crypto, expo-audio) and 8 plain packages (zod, zustand, TanStack Query, Supabase, and the four font families), then jest-expo, jest, @types/jest, eslint and eslint-config-expo as dev dependencies. Raised `maxsockets` back to the default, since the slow fetches in shift 1 were caused by throttling it to 4.
5. Wrote `eslint.config.js`, because `expo lint` needs a flat config present and this shift runs non-interactively.

6. Verified all 21 required packages are present in `node_modules` with versions read off disk, not from `package.json`. Nothing missing.
7. Verified the eight `@expo-google-fonts` export names used in `app/_layout.tsx` against the installed `index.d.ts` of each package. All eight correct: `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Fraunces_600SemiBold`, `Fraunces_700Bold`, `IBMPlexMono_400Regular`, `IBMPlexMono_500Medium`, `Caveat_400Regular`. Note the casing is `IBMPlexMono`, not `IbmPlexMono`.
8. `npm run typecheck` failed first with 34 errors, all "Cannot find name 'describe'" in `src/theme.test.ts`. Cause: TypeScript 6 no longer auto-includes `node_modules/@types`, and `expo/tsconfig.base` sets no `types` field. Fixed by adding `"types": ["jest", "node"]` to `tsconfig.json`. Did not weaken a test or the strict settings to get past it.
9. `npm run typecheck` passes, exit 0.
10. `npm run lint` passes, exit 0. Checked it was not passing by linting nothing: `npx eslint . --format json` reports 6 files linted (`app/_layout.tsx`, `app/index.tsx`, `eslint.config.js`, `jest.config.js`, `src/theme.ts`, `src/theme.test.ts`), 0 errors and 0 warnings.
11. `npm test` passes, exit 0. 1 suite, 11 tests, all passed, 2.1 s.

## Checks

Blank means not run.

| Check | Result | How |
| --- | --- | --- |
| `npm run typecheck` | Pass | `tsc --noEmit`, exit 0, no output |
| `npm run lint` | Pass | `expo lint` exit 0, confirmed with `npx eslint . --format json` showing 6 files linted, 0 errors, 0 warnings |
| `npm test` | Pass | `jest`, exit 0, 1 suite, 11 tests passed |
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
