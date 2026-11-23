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
| Web and Android both bundle | Pass | `npx expo export --platform android --platform web`, exit 0. Web 882 modules, Android 1208 modules. One `dist/index.html`, 1.4 KB, title ATLAS, which also proves `web.output: single` |
| Screen in the browser | Not proven | The bundle compiles and the page is served, but no browser was opened from this session, so nobody has seen it render. The operator must press `w` |
| Screen in Expo Go on a phone | Not proven | No phone is connected to this computer. BL-8 |

## Log, continued

12. Found `ATLAS V1 Claude Code Runbook (S00 to S41).md` in the repo root and read S00 to S02. It contradicts three things done earlier in the shift. Fixed the two where the runbook is the only authority, and raised the third for Bright.
13. Changed the Android application id from `com.atlasghana.atlas` to `com.atlas.learn`, which runbook S01 item 8 names. Recorded as D-14 superseding D-13. Done before the first commit, because the id cannot change after a Play Store publish.
14. Removed the 48 step from the spacing scale, so it is 4, 8, 12, 16, 24, 32 exactly as runbook S02 lists. Recorded as D-15, and added a test that guards the scale.
15. Added two tests for runbook S02's "There is NO red in the theme". The first attempt was wrong: it compared colour channels and failed on gold `#B9852F`, which is amber, not red. Replaced it with a hue check. Gold sits at about 37 degrees, a real red lands under 20 or over 340. The theme was right and the test was wrong, so the test was fixed rather than the theme.
16. Re-ran all three checks after the theme edits. Typecheck, lint and test all pass. 14 tests.
17. Initialised git. Set the identity **locally**, not globally, to `ATLAS build operator <build-operator@atlas.local>`, because this computer is shared and the person on shift did not give a name. Committing under the owner's email would have misattributed the work. Empty commit `S00: init` on `main`, then branch `feat/S00-setup`, then one commit of 41 files. Confirmed `node_modules`, `dist` and `.env` are all excluded. Did not push: there is no remote, and CLAUDE.md forbids pushing to `main`.

## Still open from the runbook, not done this shift

Not attempted, because the shift goal was the setup task as given, not S01 and S02 in full.

- S01 item 3: an ESLint rule forbidding `react`, `react-native` and `expo` imports inside `src/domain/`. CLAUDE.md also requires this. The runbook asks for it to be proven by a deliberately failing lint.
- S01 item 4: Prettier.
- S01 item 5: a real test in `src/domain/__tests__/sanity.test.ts` covering a pure function in `src/domain/sanity.ts`.
- S01 item 6: a `test:watch` script.
- S01 item 7: the eight placeholder routes, with `app/index.tsx` redirecting to `/(auth)/sign-in`. This shift built one screen showing ATLAS instead, as instructed.
- S01 item 9: README section on running on a phone over USB.
- S02 items 2 to 6: the font weights the runbook names differ from the eight loaded here, the seven shared components, the dev components screen, accessibility labels and reduced motion.
- S02 item 1 puts the theme at `src/components/common/theme.ts`. It is at `src/theme.ts` here, as instructed.

## S00 "Done when"

| Line | State | How checked |
| --- | --- | --- |
| Expo app with latest stable SDK, TypeScript strict, Expo Router | Proven | SDK 58.0.26 read from `node_modules/expo/package.json`, confirmed latest stable on docs.expo.dev. `strict: true` in `tsconfig.json` and `tsc --noEmit` passes. expo-router 58.0.32 installed and it bundled 1208 Android modules from `expo-router/entry` |
| Routes in `app/` at the root, template screens and components deleted | Proven | `app/` holds only `_layout.tsx` and `index.tsx`. `src/app` does not exist, which matters because Expo Router gives `src/app` precedence when both are present. The scaffold was generated in a temp folder and only config files were carried over, so no template screen, component, hook or image ever entered the repo |
| Named packages installed with `npx expo install` | Proven, with a caveat | All 21 present, versions read off disk. `npx expo install` resolved the SDK-versioned ones, which is how the correct 58.x pins were obtained. But it failed three times with `ECONNRESET`, so the final reconcile was a plain `npm install` against a `package.json` with those same pinned versions. The versions are the ones `expo install` chose; the command that last wrote `node_modules` was not `expo install`. `npx expo install --check` has not been run |
| Scripts `typecheck`, `lint`, `test`; web output `single` | Proven | All three run and pass. `web.output` is `single` in `app.json`, and the export produced exactly one `index.html` with no per-route HTML |
| `src/theme.ts` with app tokens and board tokens | Proven | All nine app tokens and all four board tokens match CLAUDE.md character for character, asserted by `toEqual` in `src/theme.test.ts`, 14 tests passing |
| `ops/` files created and the 23 Nov decision logged | Proven | STATUS, HANDOVER, DECISIONS, BLOCKERS, BUGS, ROTA and `shifts/` all exist and are committed. The decision is D-8 in `ops/DECISIONS.md`, worded as given |
| One screen showing "ATLAS" in Fraunces on paper | **Not proven** | `app/index.tsx` sets `fontFamily: Fraunces_700Bold` on `colors.paper`, it compiles for both platforms, and the font files are in the export assets. But no human or browser has seen it render. Nobody should tick this line until the operator presses `w` and scans the QR |
| Git initialised, committed on `feat/S00-setup` | Proven | `git log` shows `9c2791f S00: init` on `main` and `725c451` on `feat/S00-setup`, 41 files, 23492 insertions. Working tree clean. Not pushed, because there is no remote yet |
