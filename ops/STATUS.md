# ATLAS V1 status

Last updated: 26 November 2026, team with Bright (S15). Sprint mode is on (D-30).

## Current session

S16, topic download and board video, on `feat/S16-video-board` (cut from `feat/S15-home`). D-45. `.vtt` parser and video rules (`src/domain/vtt.ts`, `src/domain/videoPlan.ts`, tests first), topic download cache (`src/data/videoCache.ts`: one file at a time, pause and resume, size check, manifest by content version, works offline), board player on expo-video meeting P1 to P10, download screen and overview board on the topic route, dev "Board video test". R2 bucket created by Bright; **no test files uploaded yet** (`npm run media:check -- --base <R2 link>`: 0 of 44). Typecheck, lint, test (622) pass, web and Android bundles build. **Not proven: every phone check** in `specs/video-board.md` Done when (needs the upload, then content links and `content:import`).

## Earlier

S15, Home, on `feat/S15-home` (cut from `feat/S14-onboarding`). D-44. "Recommended for you" (teacher-set topics from the new `class_topics` table, segments moved on or missed in a re-check, a typed re-check slot for S33) and "Choose a topic" (Integrated Science, Mathematics "Coming soon"), topic cards with "5 parts" and a quiet progress line, prerequisite nudge (`src/domain/prerequisites.ts`, fake data in Jest) whose "Take me to the class topic anyway" always opens the topic, dev switch for a fake prerequisite on `/dev/components`. Home shows its phone copy first; the pupil gate is kept on the phone too, so an offline restart reaches Home. Migration `20261127090000_class_topics.sql` on atlas-dev, RLS 190, probe as TEST-P1 PASS. Typecheck, lint, test (559) pass, web export builds. **Not proven: the B4 gate on Phone A** (both sections open the topic, nudge shows and is skippable, airplane mode restart; BL-8).

## Earlier

S14, onboarding, on `feat/S14-onboarding` (cut from `feat/S13-codes-two-phones`), on the 23 Nov runbook (D-40: the 25 Nov rewrite was rolled back; its S14 tooling work is shelved on `feat/S14-tooling`, not for merge). D-41. Four screens plus the end screen in `src/components/onboarding/`, resume rule in `src/domain/onboarding.ts` (31 tests), answers kept on the phone first then synced, migration `20261126090000_onboarding.sql` on atlas-dev (`profiles.onboarding`, `profiles.onboarded_at`, pupil may set own name and class level). RLS 177, test:signin 25 PASS, probe as TEST-P3 PASS. Typecheck, lint, test (485) pass, web export builds. **Not proven: the B3 gate on Phone A** (stopwatch, resume, offline; `docs/test-script.md` "B3 onboarding", BL-8). BL-16 closed: `specs/data-model.md` amended with Bright present.

## Earlier

S13, pupil codes tool and two-phone test, on `feat/S13-codes-two-phones` (cut from `feat/S12-notice-consent-lock`). D-39. `src/domain/pupilCode.ts` (secure source passed in, unique by redraw), `npm run pupils:create -- --class "Test ..." --names names.csv [--consent]` makes pupil rows in atlas-dev and a git-ignored A4 code sheet in `content-work/pilot/`; `seed:dev` clears what it makes. Live: 13 fake pupils in Test Basic 7A, 13 in a new Test Basic 7C with consent, read-back matched, sheet 2 pages and 13 cards, no 0 O 1 I; a created pupil got needsPin, set a PIN, saw only its own row, wrong PIN no_match. Reseed left 0 created rows. RLS 166, test:signin 25 PASS. Typecheck, lint, test (432) pass. `docs/test-script.md` "B2 accounts" written. **Not proven: the B2 gate on two phones** (team runs the test script; BL-8 for Phone A).

## Earlier

S12, AI notice, consent gate and PIN lock, on `feat/S12-notice-consent-lock` (cut from `feat/S11-signin-screens`). D-38, BL-15. AI notice (draft text in `src/components/common/copy.ts`) saved once per pupil; every lesson route in `app/(lessons)/` behind `PupilGuard` (`src/domain/routeGuard.ts`); waiting screen with "Check again"; PIN lock after a cold start or more than 5 minutes away (`src/domain/lockRule.ts`), "Not you?". `npm run consent:set`. Seed: P3 has no profile (reseeded). Probe as P3: notice, waiting, consent on to onboarding, withdrawn back to waiting, other columns refused: 11 of 11. RLS 166, test:signin all PASS, web bundle builds. Typecheck, lint, test (394) pass. Device checks passed on the test device (P3 waiting then onboarding, PIN after 6 minutes away, "Not you?" to TEST-P2).

## Earlier

S11, sign-in screens, on `feat/S11-signin-screens` (cut from `feat/S10-pupil-signin-fn`). D-37. `app/(auth)/sign-in.tsx`: code (6 boxes, IBM Plex Mono, 0 O 1 I ignored), choose PIN, type it again, PIN (number pad, dots), all runbook copy, calm offline message with "Try again". Session saved by the Supabase client; `app/index.tsx` sends a returning pupil where `src/domain/nextScreen.ts` says. pupil-signin takes `{ code }` alone (redeployed); seed gives test pupils no PIN (reseeded). nextScreen tests 7, auth tests 68 in all; `test:signin` 25 of 25; a Node probe of the app flow for P1 reached `/notice` as expected; web bundle builds. Typecheck, lint, test (348) pass. You check run by Bright on the test device: stay signed in after reopening, lock after 5 wrong PINs with the minutes shown, calm no-connection message: all PASS. Still to repeat on Phone A, Android 9 or 10 (BL-8).

## Earlier

S10, pupil-signin Edge Function, on `feat/S10-pupil-signin-fn` (cut from `feat/S09-content-import`). D-36. Migration `20261125120000_pupil_signin.sql` (signin_rate table, six service-role-only functions) applied to atlas-dev, types regenerated, `SIGNIN_PEPPER` secret set, function deployed. `npm run test:signin` 21 of 21 PASS twice: needsPin, PIN set gives a session that RLS scopes to P1, bcrypt hash of 60 characters, 4 wrong PINs `no_match` (same as an unknown code), 5th locks for 15 minutes, right PIN refused while locked without checking, rate limit 429 at call 21, code never stored. RLS 166 of 166 (new: nobody but the service role can run the sign-in functions, `42501`). Domain tests 37. Typecheck, lint, test (299) pass. Earlier: Sentry DSN fixed (D-35), app starts.

## Earlier

S09, content import, on `feat/S09-content-import` (cut from `feat/S08-content-schema`). `npm run content:import` validates, reads atlas-dev, upserts only what changed on stable keys in one transaction, then reads back and checks. D-34: CLI login, no service role key; migration `20261125090000` adds `topics.prerequisites`, `topics.content_version`, `segments.misconceptions` (applied to atlas-dev, types regenerated). Draft loaded: 95 rows. Second run: "No changes". A one-word edit updates exactly 2 rows (the segment and the topic version). RLS 143 of 143 PASS. Import tests 38 of 38. Typecheck, lint, test (246) pass. S09 addendum: `specs/B1.md` task 6, dev-only screen `/dev/segments` (button on the sign-in placeholder) that signs in with a test user from `.env.test` and lists the Materials segments. Same query proven on atlas-dev from Node: anon sees no topic, P1 sees OV and 1A to 1E with the content version. Not seen on screen yet (BL-8). Tests 259. Watch: the very first write failed once with no message and rolled back cleanly; four writes since passed. The script now prints the CLI's full output on failure.

## Earlier

S08, content schema and draft content, on `feat/S08-content-schema` (cut from `feat/S07-seed-rls-tests`). `src/data/contentSchema.ts` with the cross-field rules (D-32), `content/materials.json` as a full DRAFT that passes, `npm run content:check` with JSON paths in plain English. D-33: a topic may have any number of segments (1A to 1Z, then 1AA), not only 1A to 1E. Schema tests 48 of 48, every cross-field rule has a failing case. Typecheck, lint, test (208) pass. Committed and pushed. Real content waits for the signed-off packs (freeze 5 Dec).

## Earlier


S07, seed data and RLS tests, on `feat/S07-seed-rls-tests` (cut from `feat/S06-db-learning`). `npm run seed:dev` seeds fake test people and rows into atlas-dev (D-31, no service role key on disk). `npm run test:rls` signs in as anon, P1 to P4, both teachers and the admin: 143 of 143 PASS. With RLS switched off on `flags` it gives 10 FAIL and exit code 1. Typecheck, lint, test (157) pass. Committed and pushed.

## Earlier today

S06 addendum (D-29) committed `3fb232a`, D-30 committed `ee78a4e`, both on `feat/S06-db-learning`.

S06, database part 2, on `feat/S06-db-learning` (cut from `feat/S05-db-people`). D-27 and D-28: spec table names, three tables added to `specs/data-model.md`, FR-30 amended so objective items are scored on the server. Two migrations applied to atlas-dev: 9 content tables and 8 learning, exam, mastery, flag and AI log tables, all with RLS. The answer key is in `exam_item_keys`, reachable by a pupil only through `get_exam_review` after their own attempt is submitted. D-29: lesson progress is owned by the server (third migration); pupils cannot write verdicts or segment status (BL-14 for S18). RLS tests 76 of 76 pass (S05 still 32 of 32). Types regenerated. Typecheck, lint, test (139) pass. Uncommitted.

## Earlier today

S05 committed and pushed (`8276b9d`). S05, database part 1, on `feat/S05-db-people` (cut from `feat/S04-eas-build`, with `chore/decision-rights` merged in). D-24 scope change committed (`5420903`): V1 is public with self sign-up behind an admin switch. Two migrations applied to atlas-dev (`gygmyjbuzbbngsoyoubg`, D-25): people tables with RLS, and the guard trigger fix. RLS tests 32 of 32 pass on atlas-dev (D-26). Types generated. Typecheck, lint, test (139) pass. Uncommitted.

## Earlier today

S04, first EAS build, committed `a982ea4` and pushed. EAS project `@lumielbright/atlas`. First build still waiting on Bright: EAS environment values, then the build run by hand (keystore prompt). Before that S04 work: on `feat/S04-eas-build` (cut from `feat/S03-supabase-sentry`). Repo side done: `eas.json` (three APK profiles), version 0.1.0 / versionCode 1, `scripts/bumpVersion.ts` with tests, "Hello ATLAS" with version on the sign-in placeholder, `docs/install.md`. Typecheck, lint, test (136) and Android export pass. Waiting on Bright: `eas login`, `eas init`, EAS environment values, first build run by hand (keystore prompt). APK size: not known until the first build.

S03 is committed (`6e44c17`, `100aea7`) and pushed to `origin/feat/S03-supabase-sentry`. Not proven: connection to atlas-dev and a scrubbed event in Sentry, both waiting on `.env` (needs `EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_APP_ENV=dev`) and `supabase link`.

Earlier today: D-16 on `chore/decision-rights` (`fb6790f`), S02 committed on `feat/S02-theme` (`fc978ff`). S02 not proven on a phone (BL-8).

## Last merged session

None. `main` holds only `S00: init`. S00 is merged into `feat/S01-expo-skeleton`, and S01 is committed there (`58ac937`), not merged.

## Build step (B0 to B12)

B0 Setup. S00 and S01 committed, S02 built. `specs/` exists, so BL-1 and BL-2 no longer block B1.

## Open PRs

None yet.

## Next 3 sessions

1. Finish `.env`, run `supabase link`, then prove S01 to S03 on screen with the dev gallery: fonts, "Check connection", "Send test error".
2. Merge order for `main`: `chore/decision-rights`, `feat/S01-expo-skeleton`, `feat/S02-theme`, `feat/S03-supabase-sentry` (Bright merges). Expect a small `ops/DECISIONS.md` conflict: keep D-16 to D-18.
3. S04: first EAS build. Needs BL-5 (Expo account) and BL-8 (phones). Approve `@sentry/cli` install script first (`npm install-scripts approve @sentry/cli`) so builds can upload source maps.

## Dates at risk

- 26 Nov: `specs/B2-ai-notice.md` and `specs/B3-playful.md` (BL-12) are needed before S10 to S14.
- B0 "Done when" (25 Nov): needs the Expo account and EAS project (BL-5) and a phone (BL-8).

---

# Detail carried from 23 November, shift 2

## Where the project stands

The repo exists and the app builds. Expo SDK 58 app on branch `feat/S00-setup`,
one commit, working tree clean, not pushed because there is no remote yet.
Typecheck, lint and tests pass. Both the Android and the web bundle compile.

One thing is still unproven: **nobody has seen the screen render.** It compiles
and the page is served, but no browser and no phone has displayed it. Do not
call S00 finished until someone does.

No lesson content, no database, no accounts.

| Step | Sessions | State |
| --- | --- | --- |
| B0 Setup | S00 to S04 | Setup task done except the on-screen check. See the runbook gap list below |
| B1 Data model and content | S05 to S09 | Blocked on BL-2, `specs/data-model.md` does not exist |
| B2 Accounts | S10 to S13 | Not started |
| B3 Onboarding | S14 | Not started |
| B4 Home | S15 | Not started |
| B5 Overview | S16 to S17 | Not started |
| B6 Segment loop | S18 to S24 | Not started |
| B7 AI hardening | S25 to S27 | Not started |
| B8 Exam | S28 to S31 | Not started |
| B9 Mastery | S32 to S33 | Not started |
| B10 Dashboard | S34 to S37 | Not started |
| B11 Low data | S38 to S39 | Not started |
| B12 Handwriting | S40 | Not started |
| Release | S41 | Not started |

## What is built and checked

- Expo SDK 58.0.26, React Native 0.88.1, React 19.3.0, TypeScript 6.0.3, strict mode.
- Expo Router, routes in `app/` at the repo root. `src/app` deliberately absent, because Expo Router gives it precedence over `app/` when both exist.
- `app/index.tsx` shows ATLAS in Fraunces on paper `#F2F4F3`. Compiles, not yet seen.
- `app/_layout.tsx` loads eight font weights at runtime, so Expo Go works without a development build.
- `src/theme.ts`: all nine app tokens and all four board tokens from CLAUDE.md, spacing 4 to 32, pill and card radii, 1px border, no shadows, no red.
- `src/theme.test.ts`: 14 tests guarding every token value, the hex format, the app and board palettes staying separate, body text at 16px, the spacing scale, and that no red can enter the theme.
- Web export is `single`. SDK 58 changed the Expo Router default to `server`, so this is set on purpose and the export was checked to produce exactly one `index.html`.
- All 21 required packages installed, versions verified on disk.

## Checks, with how they were proven

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass, exit 0 |
| `npm run lint` | Pass. Confirmed it is really linting: `npx eslint . --format json` reports 6 files, 0 errors, 0 warnings |
| `npm test` | Pass, 14 tests |
| Android bundle | Pass, 1208 modules via `npx expo export` |
| Web bundle | Pass, 882 modules, one `index.html` |
| Dev server | HTTP 200 on `http://localhost:8081` and `http://192.168.0.174:8081` |
| Screen rendered in a browser | **Not proven** |
| Screen rendered in Expo Go | **Not proven**, no phone connected, BL-8 |

## Runbook gaps, carried forward

The runbook arrived in the repo after the setup work began. The setup task maps
onto parts of **S01** and **S02**, not S00, and the runbook says S00 is run by
Bright because it writes `CLAUDE.md` and `specs/`. See BL-11.

Still open from S01 and S02, listed in full at the end of
`ops/shifts/2026-11-23-2-build-operator.md`:

- The ESLint rule forbidding `react`, `react-native` and `expo` imports inside `src/domain/`. CLAUDE.md requires this too.
- Prettier.
- A real `src/domain` test and a `test:watch` script.
- The eight placeholder routes. This shift built one ATLAS screen instead, as instructed.
- The seven shared components, the dev components screen, accessibility labels, reduced motion.
- Theme location: runbook says `src/components/common/theme.ts`, it is at `src/theme.ts` as instructed.

## Next

1. Someone presses `w` and scans the QR, and ticks or fails the two unproven lines above.
2. Bright decides on BL-11, the branch naming and session split.
3. Bright clears BL-1 and BL-2 by writing `specs/`. S05 onward cannot start without the data model.
4. Then S01 and S02 properly, closing the gap list.
