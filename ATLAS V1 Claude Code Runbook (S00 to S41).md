# ATLAS V1 Claude Code Runbook (S00 to S41)

Nov 23, 2026 · @Bright Oppong

## How to use this runbook

This runbook is the exact script for building ATLAS V1 in Claude Code. It has 42 sessions, S00 to S41. The build operator copies each prompt into Claude Code, one at a time, in order. It replaces the Claude Code runbook tab of the ATLAS V1 Build Guide. Where it disagrees with `CLAUDE.md`, `specs/prd.md`, `specs/framework.md` or `specs/video-board.md`, those files win.

### Seven rules

1. One session per branch. Branch name: `feat/S<number>-<short-name>`, for example `feat/S18-routing`.
2. Never start a session until the one before it is merged into `main` by Bright.
3. Every session starts in **Plan mode**. Paste the session prompt. Read the plan. Approve or correct it. Only then switch to **Manual mode** (approve each edit and command).
4. Read every command before you allow it. Refuse anything that touches `main` directly, deletes files you did not expect, or uses the production Supabase project.
5. Never accept "done" on Claude's word. Run the checks in the session's "You check" list yourself, on the phone where it says so.
6. Commit and push at least every 45 minutes. Nothing lives only in a chat.
7. If Claude says a request conflicts with `specs/` or `CLAUDE.md`, stop. Log it in `ops/BLOCKERS.md` for Bright. Do not argue Claude out of it.

### The loop for every session

1. **Start**: new conversation, paste the Start-of-shift prompt (once per shift).
2. **Plan**: paste the session prompt in Plan mode.
3. **Approve**: paste the Approve prompt, or correct the plan.
4. **Build**: Claude works in Manual mode. You read and allow each step.
5. **Verify**: paste the Verify prompt. Then do the "You check" list yourself.
6. **Review**: open a **new** conversation. Paste the Second-opinion review prompt. Fix what it finds in the build conversation.
7. **PR**: paste the Pull request prompt. Bright merges in shift 4.
8. **End**: paste the End-of-shift prompt at the end of every shift.

### How each session is written

| Part | What it is | What you do |
| --- | --- | --- |
| Goal | One line on what the session delivers | Read it so you know what "done" looks like |
| Needs | What must already be true | Confirm before pasting |
| Prompt | The text in the grey box | Copy all of it into Claude Code, in Plan mode |
| You check | Tests you run with your own hands | Do every line. Write the result in the shift log |
| Done when | The gate for merging | Every line must be proven before the PR |

### Time budget

A normal session takes 1.5 to 2.5 hours, including review. Plan for 2 sessions per build shift. If a session runs past 3 hours, stop, commit the work on its branch, and write the reason in `ops/HANDOVER.md`.

### Placeholders

Anything in angle brackets, for example `<your name>`, must be replaced before you paste. Nothing else in a prompt should be changed without Bright's approval.

## Before S00: ready by the end of 23 November

S00 cannot start until every box below is ticked. Bright owns this list. Keys and passwords are typed by Bright into the right place, never into a Claude chat.

### Accounts

- [ ] GitHub organisation or account with a private repo named `atlas-v1`. Branch protection on `main`: pull request required, Bright as the only approver.
- [ ] Supabase project `atlas-dev` (development). A second project `atlas-prod` is created now but not used until S41.
- [ ] Expo account and EAS access (free tier is enough for internal APK builds).
- [ ] Cloudflare account with an R2 bucket `atlas-media`, public read through a custom domain or the r2.dev URL.
- [ ] Anthropic Console: an API key for ATLAS, a monthly spend limit set, the key saved only in Supabase secrets (S05 shows where).
- [ ] Sentry project `atlas-app` (React Native).
- [ ] The ATLAS Claude account on the Max plan, signed in to Claude Code on the shared computer.

### Shared computer

- [ ] Windows user with the folders `C:\ATLAS\atlas-v1` (the repo) and `C:\ATLAS\media` (videos, never in the repo).
- [ ] Installed: Git, Node.js LTS, VS Code, Claude Code extension and CLI, Android platform tools (`adb`), a password manager for Bright.
- [ ] UPS and a mobile router as power and network backup.

### Phones

- [ ] Two low-end Android test phones (Android 9 or 10, 2 GB RAM). Label them Phone A (slowest) and Phone B.
- [ ] Developer options and USB debugging on. "Install unknown apps" allowed for the browser.

### Decisions settled (from the Build Plan)

- [ ] D-1 shift 3 used for building until 7 Dec.
- [ ] D-2 topic is Materials (Basic 7 Science).
- [ ] D-4 who acts on safeguarding alerts, and the email address alerts go to.
- [ ] D-5 budget ceiling and pilot class size.
- [ ] Segment list OV, 1A to 1E confirmed against NaCCA.

### Files Bright puts in the repo folder before S00

Save these into `C:\ATLAS\atlas-v1\_incoming\` exactly as named. S00 moves them into place.

| File in `_incoming` | Source |
| --- | --- |
| `CLAUDE.md` | Project file `CLAUDE.md` (22 Nov version) |
| `prd.md` | Project file `ATLAS_PRD.md` |
| `framework.md` | Project file `ATLAS_LESSON_FRAMEWORK.md` |
| `video-board.md` | Project file `specs/video-board.md` |
| `data-model.md` | Build Guide, Claude Code pack tab, data model section |
| `ai-prompts.md` | Build Guide, Claude Code pack tab, AI prompts section |
| `B0.md` to `B12.md` | Build Guide, Claude Code pack tab, one file per step spec |
| `BRAND-HANDOFF.md` | Project file `BRAND-HANDOFF.md` |

If any Build Guide spec is missing, S00 still runs, and Claude lists the gap in `ops/BLOCKERS.md`. The session prompts below carry enough detail to build each step even if a B-spec is thin.

## Standard prompts (used in every session)

These seven prompts wrap every session. After S14 they are also slash commands: /start-shift, /verify, /review, /pr and /end-shift. Paste them as written, replacing only the angle-bracket parts.

### P1. Start of shift (first message of every shift)

```text
I am <your name>, role: build operator. Shift <1 or 3>, date <YYYY-MM-DD>.
Shift goal: runbook session <S number> and, if time allows, <next S number>.

Follow the shift protocol in CLAUDE.md:
1. Read CLAUDE.md, ops/STATUS.md and ops/HANDOVER.md.
2. Give me a 5-line summary: where the project stands, what the last shift left unfinished, open blockers, what this shift should do first, and any risk to today's sessions.
3. Run: git status, git branch --show-current, git log --oneline -5. Tell me if anything is uncommitted or if we are not on main.
4. Confirm the last merged session number from git log. If it is not the one before <S number>, stop and tell me.
Do not change any file yet.
```

### P2. Session prompt

Paste the session's own prompt from the sections below, in Plan mode.

### P3. Approve the plan

```text
Plan approved. Rules for this build:
- Create the branch first: git checkout main, git pull, git checkout -b <branch name from the session>.
- Write the tests in src/domain before the code they test, where the session has domain logic.
- Commit after each working step with a clear message starting with the session number, for example "S18: add routing tests".
- Stop and ask me before: installing a package not named in the session, changing a migration that is already merged, touching anything outside my role's folders, or changing CLAUDE.md or specs/.
Go.
```

If the plan is wrong, do not approve. Write what is wrong instead, for example: "The plan changes specs/data-model.md. That file is Bright's. Remove that step and log the needed change in ops/BLOCKERS.md."

### P4. Verify

```text
Verify this session now.
1. Run npm run typecheck, npm run lint and npm test. Paste the last 20 lines of each.
2. Go through the session's "Done when" list line by line. Mark each line PROVEN or NOT PROVEN, and say exactly how you checked it (test name, command, or what I must look at on the phone).
3. List every file you changed in this session with one line on why.
4. List anything you skipped, faked, mocked, hard-coded or left as TODO. If none, say none.
5. Tell me the exact steps to test this on Phone A.
```

Then do the session's "You check" list yourself. Anything NOT PROVEN goes back to Claude before review.

### P5. Second-opinion review (in a NEW conversation)

Open a new Claude Code conversation in the same repo. Do not reuse the build conversation.

```text
I am <your name>, build operator. This is a review only. Do not change any file.
Review the branch <branch name> against main for runbook session <S number>.
Read CLAUDE.md, specs/prd.md, specs/framework.md, specs/video-board.md, specs/data-model.md and specs/<B spec for this session>.md first.
Then run git diff main...<branch name> and check:
1. Does the code do what the session asked, and nothing more?
2. Does it break any of the 15 "Rules that never bend" in CLAUDE.md? Check each rule by number.
3. Are the tests real? Look for tests that always pass, skipped tests, weakened asserts or mocks that hide the logic.
4. Row Level Security: can a pupil read another pupil's rows, or a teacher another class?
5. Secrets: any key, password or URL with a token in the code or in git history?
6. Copy: any exclamation mark, em dash, red error colour, streak, XP, badge or guilt message?
7. Offline: can a network failure trap a pupil on this screen?
Give findings as a numbered list, each with file, line, severity (must fix, should fix, note) and the fix. End with: READY FOR PR or NOT READY.
```

Copy the "must fix" items back into the build conversation and ask Claude to fix them. Re-run P4 after fixes.

### P6. Pull request

```text
Create the pull request for this session.
1. Make sure everything is committed and typecheck, lint and tests pass.
2. Push the branch.
3. Write the PR description in plain English with these headings: What changed; How to test on a phone (numbered steps); Done when (each line with PROVEN and how); Review findings and how they were fixed; Risks and anything left for later.
4. Title: "<S number>: <session name>".
5. Open the PR into main with gh pr create. Do not merge it.
6. Add a line to the shift log and update ops/STATUS.md: "<S number> PR open, waiting for Bright".
```

### P7. End of shift

```text
End shift.
Follow the End shift steps in CLAUDE.md:
1. Rewrite ops/HANDOVER.md from its template: what was finished, what is in progress (branch and exact next step), blockers, what the next build shift should do first.
2. Update ops/STATUS.md.
3. Finish my shift log in ops/shifts/.
4. List every uncommitted change and propose one commit message. Do not push to main.
5. Write a 5-line summary for the team WhatsApp group. No em dashes, no exclamation marks.
```

## B0 Setup: S00 to S04 (24 to 25 Nov)

B0 is done when a "Hello ATLAS" build installs on Phone A and Phone B from a link.

### S00. Repo files and specs

**Goal:** the repo exists with `CLAUDE.md`, every spec and every ops file in place, with the 22 Nov changes applied. **Needs:** everything in "Before S00". **Run by Bright**, because S00 writes `CLAUDE.md` and `specs/`, which only Bright may change. **Branch:** `feat/S00-repo-files`

```text
I am Bright, owner. Runbook session S00: repo files and specs.
The repo is C:\ATLAS\atlas-v1. The files I saved are in _incoming/.

Do this:
1. If the folder is not a git repo, run git init, set the default branch to main, add the GitHub remote atlas-v1, and make an empty first commit "S00: init" on main. Then create branch feat/S00-repo-files.
2. Move _incoming/CLAUDE.md to the repo root. Move prd.md, framework.md, video-board.md, data-model.md, ai-prompts.md and B0.md to B12.md into specs/. Move BRAND-HANDOFF.md into docs/.
3. Apply these changes from the Build Plan, section 4.4:
   a. specs/data-model.md, table video_versions: add poster_url text, captions_url text, board_colour text (hex like #F6F0E6), duration_seconds integer.
   b. specs/B1.md: add the same four fields to the content schema for each video version (posterUrl, captionsUrl, boardColour, durationSeconds).
   c. specs/B5.md and specs/B6.md: add the line "The video player follows specs/video-board.md."
   Show me each change as a diff before you write it.
4. Create the full folder layout from CLAUDE.md with a .gitkeep in each empty folder: app/, src/domain/, src/data/, src/components/{lesson,board,exam,admin,common}/, supabase/migrations/, supabase/functions/, content/, scripts/, docs/, ops/shifts/, content-work/{packs,scripts,media,legal,pilot}/.
5. Create the ops files with these templates:
   - ops/STATUS.md: headings Current session, Last merged session, Build step (B0 to B12), Open PRs, Next 3 sessions, Dates at risk.
   - ops/HANDOVER.md: headings Date and shift, Who, Finished, In progress (branch and next exact step), Blockers, Do first next shift.
   - ops/DECISIONS.md: a table with columns ID, Date, Decision, By, Why. Add D-1 to D-6 from the Build Plan with status open or settled as I tell you.
   - ops/BLOCKERS.md: a table with columns Date, Raised by, Blocker, Needs, Status.
   - ops/BUGS.md: a table with columns ID, Date, Phone, Screen, Steps, Expected, Actual, Severity (crash, wrong mark, blocks pupil, minor), Session, Status.
   - ops/ROTA.md: a table of shifts 1 to 4 per day from 24 Nov to 14 Dec, with a Who column left blank.
   - docs/test-script.md and docs/path-checklist.md with a heading only.
6. Add .gitignore for Node, Expo, Android builds, .env*, *.mp4, *.mp3, *.wav, *.mov and _incoming/.
7. Add a short README.md: what ATLAS V1 is (3 lines), how to run it (to fill in S01), and "Read CLAUDE.md first".
8. Delete the empty _incoming/ folder.
9. Commit, push the branch, and list any spec that was missing from _incoming. Log each missing spec in ops/BLOCKERS.md.
Do not write any app code in this session.
```

**You check**

- Open `specs/data-model.md` and find the four new `video_versions` fields.
- Open `specs/B5.md` and `specs/B6.md` and find the video-board line.
- Confirm `.gitignore` lists `*.mp4` and `.env*`.
- On GitHub, the branch shows every file. No video, no key.

**Done when**

- Every spec from the table in "Before S00" is in `specs/` or logged as missing.
- All ops files exist with their templates.
- Bright has merged the PR into `main`.

### S01. Expo app skeleton

**Goal:** an Expo TypeScript app that runs on Phone A over USB, with lint and tests wired. **Branch:** `feat/S01-expo-skeleton`

```text
Runbook session S01: Expo app skeleton. Read CLAUDE.md and specs/B0.md first.

Build:
1. Create an Expo app in the repo root using the latest stable Expo SDK, TypeScript, Expo Router. Keep the folder layout from CLAUDE.md. Do not create a nested project folder.
2. tsconfig: strict true, noUncheckedIndexedAccess true, path alias @/ for src/.
3. ESLint with the Expo config plus a rule that forbids importing react, react-native or expo packages inside src/domain/.
4. Prettier with default settings.
5. Jest with jest-expo. Add one real test in src/domain/__tests__/sanity.test.ts that tests a tiny pure function in src/domain/sanity.ts.
6. package.json scripts: start, android, web, typecheck (tsc --noEmit), lint, test, and test:watch.
7. Expo Router routes as empty placeholder screens, each showing only its route name in plain text: app/(auth)/sign-in.tsx, app/onboarding/index.tsx, app/home/index.tsx, app/topic/[id].tsx, app/segment/[id].tsx, app/exam/[id].tsx, app/results/[id].tsx, app/admin/index.tsx. app/index.tsx redirects to /(auth)/sign-in.
8. app.json: name "ATLAS", slug "atlas", Android package com.atlas.learn, orientation portrait, userInterfaceStyle light. No iOS work.
9. Update README.md with how to run on a phone over USB.
10. Run typecheck, lint and test. Then start the dev server and tell me how to open the app on Phone A with Expo Go or a development build.
```

**You check**

- `npm run typecheck`, `npm run lint`, `npm test` all pass on your screen.
- Phone A opens the app and shows "sign-in".
- Try adding `import React from 'react'` to `src/domain/sanity.ts`. Lint must fail. Remove it again.

**Done when**

- The app opens on Phone A.
- The domain import rule is proven by a failing lint.
- All three checks pass.

### S02. Look and feel: tokens, fonts, base components

**Goal:** the "paper and ink" theme and the small set of shared components every screen uses. **Branch:** `feat/S02-theme`

```text
Runbook session S02: theme and base components. Read CLAUDE.md (section Look), docs/BRAND-HANDOFF.md (primary "paper and ink" system only) and specs/video-board.md (board tokens, Caveat font).

Build:
1. src/components/common/theme.ts with these exact tokens:
   app: paper #F2F4F3, ink #16233E, inkSoft #4C566B, gold #B9852F, goldSoft #E9D2A4, teal #2F6F5E, tealSoft #D6E7E1, line #DDE2DE, card #FCFCFA.
   board: board #F6F0E6, boardInk #1C2740, boardMuted #6B6558, boardLine #E4DCCB.
   Spacing scale 4, 8, 12, 16, 24, 32. Radius: card 16, pill 999. Body size 16.
   There is NO red in the theme. Do not add one.
2. Fonts bundled with expo-font: Inter (400, 600), Fraunces (600), IBM Plex Mono (500), Caveat (700). Load them before the first screen shows; keep the splash screen up until they load.
3. Components in src/components/common/, each with a short usage comment:
   - Screen: paper background, safe area, scroll, 16 padding.
   - Heading (Fraunces), Body (Inter 16), Label (IBM Plex Mono, uppercase, small).
   - PillButton: primary (ink background, paper text), secondary (card background, 1px line border), disabled state, minimum touch size 48.
   - Card: card background, 1px line border, radius 16, no shadow.
   - TextField: pill shape, 1px line border, visible focus ring in teal.
   - CalmError: a plain message plus a "Try again" PillButton. No icon, no red.
   - LoadingCalm: small text "One moment" plus a quiet spinner in inkSoft.
4. Every touchable has an accessibilityLabel and a visible focus style. Respect reduced motion: no animation when the phone asks for reduced motion.
5. A dev-only screen app/dev/components.tsx that shows every component, reachable only when __DEV__ is true.
6. Replace the placeholder screens' plain text with Screen + Heading so the look shows everywhere.
Write no copy with exclamation marks or em dashes.
```

**You check**

- Open the dev components screen on Phone A. Fonts show as Fraunces headings and Inter body.
- Turn on "Remove animations" in Android accessibility settings. Nothing animates.
- Search the code for `#FF`, `red` and `!"`. Nothing in the theme or copy.

**Done when**

- Every token matches `CLAUDE.md` exactly.
- All seven components render on Phone A.

### S03. Supabase, environment and Sentry

**Goal:** the app talks to `atlas-dev`, errors reach Sentry, and no secret is in the repo. **Needs:** Bright has the `atlas-dev` URL and anon key, and the Sentry DSN, ready to type into `.env` himself. **Branch:** `feat/S03-supabase-sentry`

```text
Runbook session S03: Supabase client, environment and Sentry. Read CLAUDE.md (Stack, rules 1 and 15) and specs/B0.md.

Build:
1. Install @supabase/supabase-js, @react-native-async-storage/async-storage, @tanstack/react-query, zustand, zod, @sentry/react-native.
2. .env.example with EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SENTRY_DSN and EXPO_PUBLIC_APP_ENV (dev or prod). No real values. Tell me to create .env myself and type the values; never ask me to paste them into this chat.
3. src/data/env.ts: reads those variables, validates them with zod, and throws a clear developer error if one is missing. If EXPO_PUBLIC_APP_ENV is prod while __DEV__ is true, refuse to start.
4. src/data/supabase.ts: one Supabase client with AsyncStorage session storage and auto refresh.
5. React Query provider and a Zustand store file src/data/uiStore.ts (empty store with a version field) in app/_layout.tsx.
6. Sentry init in app/_layout.tsx. Strip any field named name, pin, code, answer or reason from events before sending (beforeSend). Add a dev-only button on the dev components screen that throws a test error.
7. A supabase/ folder set up with the Supabase CLI (supabase init) linked to atlas-dev. Do not run any migration yet.
8. A health check: on the dev screen, a button that calls supabase.auth.getSession() and shows "Connected to atlas-dev" or a CalmError.
9. Check git for secrets: run git grep for "eyJ" and "sk-ant" and show me the result.
```

**You check**

- Bright types the real values into `.env`. The dev screen shows "Connected to atlas-dev".
- Tap the test error button. The error appears in Sentry within 2 minutes, with no pupil fields.
- `git status` does not show `.env`.

**Done when**

- Connected to `atlas-dev` on Phone A.
- Sentry receives a scrubbed test error.
- The secret search returns nothing.

### S04. First installable build

**Goal:** an APK built by EAS that installs on both phones from a link. **Branch:** `feat/S04-eas-build`

```text
Runbook session S04: first EAS build. Read CLAUDE.md (Stack: builds) and specs/B0.md.

Build:
1. eas.json with three profiles: development (development client, internal), preview (APK, internal distribution, EXPO_PUBLIC_APP_ENV=dev), production (APK, internal, EXPO_PUBLIC_APP_ENV=prod). The production profile is not used until S41.
2. Environment values for EAS builds are set as EAS secrets or EAS environment variables by Bright. Tell me the exact commands; I will run the ones with values myself.
3. The sign-in placeholder screen shows "Hello ATLAS" in Fraunces with the app version under it in IBM Plex Mono.
4. Version: 0.1.0, Android versionCode 1. Add scripts/bumpVersion.ts that bumps both.
5. Run eas build --platform android --profile preview. Wait for it. Give me the install link.
6. Write docs/install.md: how to install the APK from the link on a new phone, including turning on "Install unknown apps", in 8 steps or fewer.
7. Record the APK size in ops/STATUS.md.
```

**You check**

- Install from the link on Phone A and Phone B, following `docs/install.md` exactly.
- Cold start time on Phone A: stopwatch from tap to "Hello ATLAS". Write it in the shift log. Target under 4 seconds.

**Done when (B0 gate)**

- "Hello ATLAS" installs and opens on both phones from the link.
- Cold start on Phone A is recorded.

## B1 Data model and content: S05 to S09 (26 Nov)

B1 is done when draft content loads with one command, and a pupil cannot read another pupil's rows. `specs/data-model.md` is the source for table and column names. If a prompt below names a table the spec does not have, Claude must stop and ask, not invent.

### S05. Database part 1: people, classes, consent

**Goal:** the tables for people, with Row Level Security on from the first migration.

**Branch:** `feat/S05-db-people`

```text
Runbook session S05: database part 1. Read CLAUDE.md (rules 8, 15), specs/data-model.md and specs/B1.md.
Work only against atlas-dev. Every change is a SQL file in supabase/migrations/. Never change the database by hand.

Build migrations for the people side of specs/data-model.md. At minimum this covers:
- schools, classes (school, name, level such as Basic 7, teacher)
- staff profiles linked to auth.users, with role admin or teacher
- pupils linked to auth.users: class, display name, 6-character code (unique), PIN hash, failed PIN count, locked until, ai notice seen at, created at
- consents: pupil, recorded by, consent date, form reference, withdrawn at
- pupil_profiles: interests, onboarding choices, overview keywords, overview confusions, updated at

Rules:
1. Enable Row Level Security on every table in the same migration that creates it.
2. Helper SQL functions: is_admin(), is_teacher_of(class_id), current_pupil_id(). Mark them security definer with a fixed search_path.
3. Policies: a pupil reads and updates only their own pupil and pupil_profiles rows, and never reads pin_hash. A teacher reads pupils in their own classes only. An admin reads and writes everything. No table is readable by the anon role.
4. pin_hash, failed PIN count and locked until are never selectable by the pupil. Use a view or column privileges, and explain your choice in the plan.
5. Generate TypeScript types into src/data/database.types.ts with the Supabase CLI.
6. Explain in the plan any place where specs/data-model.md is unclear. Do not guess. List those for me.
Apply the migrations to atlas-dev with supabase db push. Show me the command before running it.
```

**You check**

- In the Supabase dashboard for `atlas-dev`, every new table shows "RLS enabled".
- Confirm the project name in the dashboard says `atlas-dev`, not `atlas-prod`.

**Done when**

- Migrations applied to `atlas-dev` with RLS on every table.
- Types generated and typecheck passes.

### S06. Database part 2: learning, exam, flags, AI log

**Goal:** every remaining table the app needs, with RLS.

**Branch:** `feat/S06-db-learning`

```text
Runbook session S06: database part 2. Read CLAUDE.md, specs/data-model.md, specs/B1.md, specs/framework.md and specs/prd.md sections 6 and 8.

Build migrations for the rest of specs/data-model.md. At minimum this covers:
- content: topics, segments, video_versions (label, url_360, url_480, poster_url, captions_url, board_colour, duration_seconds, example_world, misconception_tags, interest_tags), check_questions (segment, try number, question, accepted answers, tap options, reason options with sound or misconception code, reference reasoning), worked_example_cards, exam_papers (A or B), exam_items (objective or theory, options, correct option, scheme points, marks), recheck_items
- learning: overview_responses, segment_progress (pupil, segment, status not_started, in_progress, complete, moved_on, tries_used, versions_seen), attempts (every field in PRD FR-23)
- exam: exam_sittings (pupil, paper, started_at, duration_seconds, submitted_at, auto_submitted, total), exam_answers (item, answer, marks, borderline, approved_by, approved_at)
- mastery: mastery_records (pupil, topic, exam_sitting, achieved_at, recheck_due_at, recheck_result)
- flags: kind stalled, borderline or safeguarding; pupil; segment or exam answer; created at; admin decision content_fix or human_help; note; cleared at
- ai_calls: job, model, pupil_id, input, output, ok, latency_ms, created_at

Rules:
1. RLS on every table. Content tables: readable by any signed-in pupil, teacher or admin; writable only by admin and the service role.
2. Pupil data tables (overview_responses, segment_progress, attempts, exam_sittings, exam_answers, mastery_records): a pupil reads and inserts only their own rows. A pupil can never update marks, borderline, approved fields, totals or flags.
3. flags and ai_calls: no pupil access at all. Teachers read flags for their own class only. Admin everything. Only the service role inserts ai_calls.
4. exam_items.correct_option and scheme points must never be readable by a pupil before their sitting is submitted. Propose how (for example a security definer function that returns items without answers). Explain it in the plan.
5. Add indexes on every foreign key and on (pupil_id, segment_id).
6. Regenerate src/data/database.types.ts.
Show me supabase db push before running it.
```

**You check**

- Dashboard: RLS enabled on every new table.
- In the plan, Claude explained how exam answers stay hidden. Read that part closely. If you do not understand it, ask Claude to explain it again in plain words.

**Done when**

- All tables exist with RLS.
- No pupil policy allows reading exam answers before submission.

### S07. Seed data and RLS tests

**Goal:** fake test people, and automatic tests that prove the privacy rules.

**Branch:** `feat/S07-seed-rls-tests`

```text
Runbook session S07: seed data and Row Level Security tests. Read CLAUDE.md (rules 8, 15) and specs/data-model.md.

Build:
1. supabase/seed.sql or scripts/seedDev.ts (your choice, explain why) that creates in atlas-dev only:
   - 1 school "Test School", 2 classes: "Test Basic 7A" and "Test Basic 7B"
   - 1 admin (test-admin), 2 teachers (one per class)
   - 3 test pupils in 7A (TEST-P1, TEST-P2, TEST-P3) and 1 in 7B (TEST-P4), with fake names only, for example "Ama Test"
   - consent recorded for P1, P2, P4. P3 has no consent, on purpose
   The script refuses to run unless the Supabase URL is atlas-dev.
2. An automated RLS test suite (scripts/rlsTests.ts run with npm run test:rls) that signs in as each test user and proves:
   - P1 sees only P1's pupil, profile, attempts and progress rows
   - P1 cannot read P2's rows, cannot update their own marks, cannot read flags or ai_calls, cannot read pin_hash
   - P1 cannot read exam correct options or scheme points
   - Teacher of 7A sees P1 to P3 and not P4
   - Admin sees everything
   - anon sees nothing
   Each check prints PASS or FAIL. Any FAIL exits with code 1.
3. Add npm run test:rls to the Verify steps in README.md.
4. Test credentials live in .env.test (git-ignored). Give me a .env.test.example with no real values.
```

**You check**

- Run `npm run test:rls` yourself. Every line says PASS.
- Break it on purpose: ask Claude, on a scratch branch, to disable one policy. The suite must FAIL. Throw that branch away.

**Done when**

- RLS suite passes, and fails when a policy is removed.

### S08. Content schema and draft content file

**Goal:** a zod schema for `content/materials.json` and a valid draft file.

**Branch:** `feat/S08-content-schema`

```text
Runbook session S08: content schema and draft content. Read specs/B1.md, specs/prd.md section 7, specs/framework.md stage 4, and specs/video-board.md section 5.

Build:
1. src/data/contentSchema.ts with zod, exporting the schema and its TypeScript type. Shape:
   topic: id, subject, level, title, prerequisites (list of topic ids), overview video (same fields as a version)
   segments 1A to 1E, each with: code, title, objective, reference meaning, misconceptions [{ code like "1B-M1", text }], versions a and b, three check questions (try 1, 2, 3), worked example card { text under 120 words, photoUrl }
   video version: label, url360, url480, posterUrl, captionsUrl, boardColour (hex), durationSeconds (max 180), exampleWorld, misconceptionTags, interestTags
   check question: question, acceptedAnswers, tapOptions (exactly 3), reasonOptions (exactly 3: one with sound true, two each with a misconceptionCode), referenceReasoning
   exam: paperA and paperB, each with 10 objective items (4 options, correctIndex) and 3 theory items (question, marks, schemePoints [{ point, marks }]), durationMinutes
   recheck: exactly 3 items
2. Cross-field rules with superRefine: every misconceptionTag and reasonOption code exists in that segment's misconception list; worked example under 120 words; no text field contains "!" or an em dash character; interest tags only from: football, music, farming, stories, cooking, market, animals, phones and computers.
3. content/materials.json: a full draft that passes the schema. Use clearly marked placeholder wording, starting every text with "DRAFT:". Use real segment titles from specs/prd.md section 7.1. Video URLs point to https://media.example/placeholder for now.
4. scripts/validateContent.ts (npm run content:check) that prints every error with its JSON path in plain English, and exits 1 on any error.
5. Jest tests for the schema: one valid file, and one failing case for each cross-field rule.
Do not invent science content. Real content comes from the content packs after Bright signs them off.
```

**You check**

- Run `npm run content:check`. It passes.
- Change one `misconceptionTags` value in a copy of the file to a code that does not exist. The check names the exact path. Undo it.

**Done when**

- Schema tests pass, including every cross-field rule.

### S09. Content import with one command

**Goal:** `npm run content:import` loads the content file into the database, safely and repeatably.

**Branch:** `feat/S09-content-import`

```text
Runbook session S09: content import. Read specs/B1.md, CLAUDE.md (rule 15, role table: content/materials.json import only).

Build scripts/importContent.ts, run with npm run content:import:
1. Validates content/materials.json with contentSchema first. Stops on any error.
2. Uses the service role key from .env.import (git-ignored; give me .env.import.example). It runs on the shared computer only, never in the app.
3. Refuses to run against any project except atlas-dev unless called with --prod AND the typed confirmation "IMPORT TO PROD". (Prod import only happens in S41.)
4. Upserts by stable keys (topic id, segment code, version label, try number, paper and item number), so running it twice changes nothing the second time.
5. Prints a summary: topics, segments, versions, check questions, cards, exam items, recheck items, inserted versus updated.
6. Writes a content version string (date plus short hash of the file) to the topic row, so the app can tell when content changed.
7. Jest test for the key-building and diff logic in src/domain or scripts/lib (pure functions only).
Then run it on atlas-dev and show me the summary. Run it again and show me it reports no changes.
```

**You check**

- Run `npm run content:import` twice yourself. Second run: nothing inserted or updated.
- Run `npm run test:rls` again. Still all PASS.

**Done when (B1 gate)**

- Draft content loads with one command, and a second run changes nothing.
- RLS suite still passes.

## B2 Accounts: S10 to S13 (26 to 27 Nov)

B2 is done when 3 test pupils sign in on 2 phones, the PIN lock works, and the consent gate works.

### S10. Pupil sign-in function

**Goal:** a server function that checks a pupil code and PIN and returns a session, with no PIN ever stored in plain text.

**Branch:** `feat/S10-pupil-signin-fn`

```text
Runbook session S10: pupil-signin Edge Function. Read CLAUDE.md (rules 1, 2, 8), specs/prd.md FR-1 and FR-2, specs/B2.md and specs/data-model.md.

Build supabase/functions/pupil-signin (TypeScript, Deno):
1. Input: { code, pin }. Validate with zod: code is 6 characters from the set without 0, O, 1 or I (uppercase it first); pin is exactly 4 digits.
2. Look up the pupil by code with the service role.
3. First sign-in (no PIN set yet): return { needsPin: true } and do nothing else. A second call with { code, pin, setPin: true } stores a strong hash of the PIN (bcrypt or argon2; say which library works in Deno) and signs the pupil in.
4. Normal sign-in: compare the hash. Wrong PIN adds 1 to failed count. On the 5th wrong PIN, set locked_until to now plus 15 minutes and return { locked: true, minutes }. A correct PIN resets the count.
5. While locked, refuse without checking the PIN.
6. On success, return a normal Supabase session for that pupil's auth user, so RLS works with auth.uid(). In the plan, explain exactly how you mint the session (for example a hidden per-pupil password kept only in the database and used server side, or the admin API). Pick the simplest safe way. Never return the hash or any other pupil's data.
7. Same error message for "unknown code" and "wrong PIN", so codes cannot be guessed.
8. Rate limit: at most 20 calls per minute per code.
9. Never log the PIN or the code in plain text.
10. Tests: pure functions (code format check, lockout maths) go in src/domain/auth.ts with Jest tests written first. Add a script scripts/testSignin.ts that runs the full flow against atlas-dev with TEST-P1.
Deploy to atlas-dev with supabase functions deploy pupil-signin. Show me the command first.
```

**You check**

- Run `scripts/testSignin.ts`. It shows first-time PIN set, a correct sign-in, 5 wrong PINs, then locked.
- In the dashboard, the pupil row shows a long hash in `pin_hash`, never 4 digits.

**Done when**

- Lockout after 5 wrong PINs for 15 minutes, proven by the script.
- PIN stored only as a hash.

### S11. Sign-in screens

**Goal:** the pupil can sign in on the phone, set a PIN the first time, and stay signed in.

**Branch:** `feat/S11-signin-screens`

```text
Runbook session S11: sign-in screens. Read CLAUDE.md (Look, rule 7), specs/prd.md 6.1 and specs/B2.md.

Build in app/(auth)/:
1. Code screen: heading "Welcome to ATLAS", text "Type the code your teacher gave you.", a 6-box code input in IBM Plex Mono, uppercase only, letters that cannot appear (0, O, 1, I) are ignored as they are typed. PillButton "Next".
2. Set PIN screen (first time): "Choose a 4-digit PIN. Keep it secret." then "Type it again." Number pad input, digits shown as dots. If the two do not match: "Those did not match. Try again."
3. PIN screen (normal): "Type your PIN." Wrong PIN: "That code and PIN did not match. Try again." Locked: "Too many tries. Please wait <n> minutes, or ask your teacher."
4. On success, save the session (Supabase client storage) and go to the next step decided by a router function in src/domain/nextScreen.ts: no AI notice seen goes to the notice, no consent goes to waiting, onboarding not finished goes to onboarding, else home. Write the Jest tests for nextScreen first.
5. Calm error for no network: "No connection. Check the data and try again." with "Try again".
6. Big touch targets, works with the phone keyboard and with a number pad. Nothing in red.
Use only copy written above, or copy from the specs. Show me any new copy in the plan.
```

**You check**

- On Phone A: sign in as TEST-P1 for the first time, set a PIN, close the app fully, reopen. You are still signed in.
- Type a wrong PIN 5 times as TEST-P2. The lock message shows the minutes.
- Turn on airplane mode and try to sign in. The calm message shows. No crash.

**Done when**

- First-time and normal sign-in both work on Phone A.
- `nextScreen` tests pass.

### S12. AI notice, consent gate and PIN lock on return

**Goal:** the pupil sees the AI notice once, cannot start lessons without recorded consent, and the app asks for the PIN again on a shared phone.

**Branch:** `feat/S12-notice-consent-lock`

```text
Runbook session S12: AI notice, consent gate and PIN lock. Read specs/prd.md FR-3, FR-4 and section 10, specs/B2.md and CLAUDE.md rule 7.
The final AI notice wording comes from the data protection consultant. Use this draft and keep the text in one file, src/components/common/copy.ts, so it can be replaced without code changes:
"ATLAS is a learning app. Some of your answers are checked by a computer program called AI. It looks at what you write to see how you are thinking. It does not see your name. A teacher can check its work. You can ask your teacher any time if something feels wrong."

Build:
1. AI notice screen: the text above, one PillButton "I understand". Saves ai_notice_seen_at. Shown once per pupil, not once per phone.
2. Consent waiting screen (no consent row, or consent withdrawn): "You are all set. Your teacher will let you start soon." with a "Check again" button. No lesson routes are reachable from it, including by deep link. Guard every lesson route.
3. PIN lock on return: if the app was in the background more than 5 minutes, or the phone was restarted, ask for the PIN again before showing anything. Put the timing rule in src/domain/lockRule.ts with tests first.
4. "Not you?" link on the PIN screen: signs out this pupil and returns to the code screen, so another pupil can use the shared phone.
5. For development only, scripts/setConsent.ts --code TEST-P3 --on or --off to record or withdraw consent in atlas-dev. (The admin dashboard does this properly in S34.)
```

**You check**

- Sign in as TEST-P3 (no consent). Only the waiting screen. Run `setConsent --on`, tap "Check again". Onboarding opens.
- Put the app in the background for 6 minutes. Reopen. PIN screen shows.
- Tap "Not you?" and sign in as TEST-P2 on the same phone.

**Done when**

- Consent gate blocks every lesson route.
- AI notice saved once per pupil.
- `lockRule` tests pass.

### S13. Pupil codes tool and two-phone test

**Goal:** a safe way to create pupils with codes for testing and a printable code sheet, then the B2 gate on both phones.

**Branch:** `feat/S13-codes-two-phones`

```text
Runbook session S13: pupil codes and two-phone test. Read specs/prd.md FR-1, specs/B2.md, CLAUDE.md rules 2 and 15.

Build:
1. src/domain/pupilCode.ts: generate a 6-character code from the alphabet ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no 0, O, 1, I) using a secure random source passed in, so tests can fix it. Tests first: length, alphabet, no collisions in 10,000 codes with a real random source.
2. scripts/createPupils.ts --class "Test Basic 7A" --names names.csv: creates auth users and pupil rows in atlas-dev, gives each a unique code, and writes a printable HTML code sheet to content-work/pilot/codes-<class>-<date>.html. The sheet shows the class, first name and code only, 12 per A4 page, cut lines, and the line "Keep this code. Do not share your PIN."
3. The sheet file name pattern is git-ignored, because it holds pupil names.
4. docs/test-script.md: add a section "B2 accounts" with the two-phone test steps below, so the QA tester can repeat it.
5. Two-phone test (write the steps; I will run them):
   a. Phone A: TEST-P1 signs in. Phone B: TEST-P2 signs in.
   b. Phone B: "Not you?", then TEST-P3 signs in and sees the consent wait.
   c. Phone A: TEST-P1 signs out, TEST-P2 signs in on Phone A too (same pupil on two phones works).
   d. Lock: 5 wrong PINs for TEST-P1 on Phone B. Phone A also refuses TEST-P1 until 15 minutes pass.
```

**You check**

- Run every step of the two-phone test from `docs/test-script.md`. Write each result in the shift log.
- Open the code sheet in a browser and print one page. No 0, O, 1 or I anywhere.

**Done when (B2 gate)**

- 3 test pupils sign in across 2 phones.
- PIN lock and consent gate proven on the phones.

## Upgrade from S14: build each piece once, to a high bar

From S14 the runbook builds the shared foundations first, then every feature on top of them, finished the first time. The earlier version built screens with "simple versions" of saving, AI calls and errors, then came back in S25 to S27 and S38 to S39 to harden them. That meant reworking every screen twice. Now there is no "basic version now, hardened later" anywhere.

S00 to S13 are done and unchanged. The session numbers still run S14 to S41, and the release dates do not move.

### What "best of its kind" means for ATLAS V1

These are the bars every session is checked against. Each one is measurable on a phone or in a test.

| Area | The bar |
| --- | --- |
| Learning design | Every answer is followed by "Why do you think so?". A wrong reason picks the next video by misconception, never at random. Spaced re-check after mastery. No points, streaks or red |
| Nothing is ever lost | Every pupil action is written to the phone's database before anything else happens, then synced with an idempotency key. Proven by killing the app mid-sync and restarting the phone |
| AI you can trust | One AI gateway for all jobs. Schema-constrained JSON outputs, zod checked again, 20-second limit, tap fallback, 120-call cap, every call logged with its prompt version. An evaluation set runs on every prompt change |
| Never trapped | With the topic downloaded, the whole topic works in airplane mode. Only AI checks need the network, and they fall back to taps |
| Fast on a 2 GB phone | Cold start, screen change and video start each under 4 seconds on Phone A. No out-of-memory crash in a 60-minute session. Peak memory recorded |
| Safe for children | No names sent to AI. No open chat. Safeguarding text raises a flag and an email within 2 minutes, retried until sent |
| Accessible | TalkBack labels on every control, 48 dp touch targets, text readable at 130% font size, reduced motion respected |
| Tested like a product | Unit tests for every rule, an RLS suite for every table, Maestro end-to-end flows for every pupil path, all run on every pull request |
| Measured from day one | An event log records every step of the journey, so the pilot success measures come straight from data, not from memory |

### What the research changed in the prompts

- **Structured outputs are now generally available in the Claude API.** The AI gateway asks for JSON with `output_config.format` and a JSON schema, so the reply always parses. zod still checks it (CLAUDE.md rule 3), because a valid shape can still hold a bad value.
- **Expo SDK memory regression.** SDK 56 and early SDK 57 releases had a Hermes V1 memory regression, fixed in `expo@57.0.17`. On 2 GB phones this matters. S14 checks the SDK version first.
- **expo-video details.** Controls are off only with `nativeControls={false}`. The `timeUpdate` event is off until `timeUpdateEventInterval` is set, which the captions need. Players made with `createVideoPlayer` must be released, or memory leaks. Picture-in-picture and background play stay off by default, which we keep.
- **Supabase.** Alert emails run as background work (`EdgeRuntime.waitUntil`) with a database outbox and a scheduled retry, instead of one function calling another, which is now rate limited.
- **Maestro on EAS Workflows** gives automated phone tests on every pull request. Note: the Maestro job type is still alpha on EAS. If it misbehaves, run Maestro locally against Phone A instead.
- **Claude Code project setup.** Slash commands in `.claude/commands/`, hooks and permission rules in `.claude/settings.json`. The P1 to P7 prompts become `/start-shift`, `/verify`, `/review`, `/pr` and `/end-shift`, so nobody copies long prompts by hand after S14.

### Old to new session map

| New | Session | Was |
| --- | --- | --- |
| S14 | Health check, Claude Code tooling, CI and E2E harness | New |
| S15 | Phone database, outbox and sync engine | S39, parts of S14 and S20 |
| S16 | AI gateway, cap, logging, safeguarding alerts | S25, S26, S27 |
| S17 | Reliability layer: errors, telemetry, dev tools gate, accessibility kit | Parts of S24, S39 |
| S18 | Onboarding | S14 |
| S19 | Home and prerequisites | S15 |
| S20 | Topic download, content cache, storage and data size | S16 (download), S38 (cache) |
| S21 | Board video player | S16 (player) |
| S22 | Overview and ai-overview | S17 |
| S23 | Routing, tries and tie-break rules | S18 |
| S24 | ai-check job and its evaluation set | S19, gate runner from S27 |
| S25 | Attempts, segment progress and flags | S20 |
| S26 | Segment screen: video and "Your turn" | S21 |
| S27 | Confidence, reason, read-back | S22 |
| S28 | Outcomes and Recommended | S23 |
| S29 | Path checklist, E2E flows, Sprint 1 demo | S24 |
| S30 | Exam timer, scoring and unlock rules | S28 |
| S31 | Exam screens | S29 |
| S32 | Submit, theory marking, borderline | S30 |
| S33 | Results and retake | S31 |
| S34 | Mastery and spaced re-check | S32, S33 |
| S35 | Admin web: classes, pupils, consent | S34 |
| S36 | Flags and borderline review | S35 |
| S37 | Progress, pilot measures, teacher view | S36, S37 |
| S38 | Pilot rehearsal: offline, speed, memory, data | S38 audits |
| S39 | Bug bash, accessibility and copy sweep | S39 audits |
| S40 | Handwriting (optional) | S40 |
| S41 | Release 0.9 and 1.0 | S41 |

### Target dates

| Sessions | Target | Gate |
| --- | --- | --- |
| S14 to S17 | 26 to 28 Nov | Foundations: CI green, outbox survives a restart, gateway tests pass |
| S18 to S19 | 28 to 29 Nov | B3 and B4 gates |
| S20 to S22 | 29 to 30 Nov | B5 gate |
| S23 to S29 | 30 Nov to 3 Dec | B6 gate, Sprint 1 demo |
| S30 to S34 | 3 to 5 Dec | B8 and B9 gates |
| S35 to S37 | 5 to 6 Dec | B10 gate |
| S38 to S39 | 6 to 7 Dec | B11 gate |
| S40 | 7 Dec, only if all merged | B12 gate |
| S41 | 8 Dec (0.9), 14 Dec (1.0) | Release gate |

The Sprint 1 demo moves from 1 Dec to 3 Dec, because the foundations come first. In return, the old AI hardening days (2 to 3 Dec) are no longer needed. Bright records this in `ops/DECISIONS.md` and updates section 4.3 of the Build Plan.

### Sources

- [Claude API: structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Expo SDK 57 changelog: known regressions](https://expo.dev/changelog/sdk-57)
- [Expo SDK 55 upgrade guide: Android 7+ minimum](https://expo.dev/blog/upgrading-to-sdk-55)
- [expo-video reference](https://docs.expo.dev/versions/latest/sdk/video)
- [Supabase Edge Functions: background tasks](https://supabase.com/docs/guides/functions/background-tasks)
- [Supabase: rate limits on nested Edge Function calls](https://supabase.com/changelog/43644-edge-functions-rate-limits-on-recursive-nested-edge-functions-calls)
- [Expo: E2E tests with Maestro on EAS Workflows](https://docs.expo.dev/eas/workflows/examples/e2e-tests/)

## Phase F Foundations: S14 to S17 (26 to 28 Nov)

The foundations gate: CI is green on every pull request, a queued action survives an app kill and a phone restart, and the AI gateway passes all its failure tests. No feature session starts before this gate.

### S14. Health check, Claude Code tooling, CI and E2E harness

**Goal:** confirm what S00 to S13 built, fix the SDK if needed, and set up the tools that make every later session faster and safer.

**Needs:** S13 merged. **Run by Bright**, because this session writes `.claude/` and `.github/`, which are outside the build operator's folders.

**Branch:** `feat/S14-tooling`

```text
I am Bright, owner. Runbook session S14: health check, Claude Code tooling, CI and E2E harness.
Read CLAUDE.md, specs/prd.md section 11, and the runbook rules. Plan first. Wait for my approval.

Part A: health check (report only, change nothing yet)
1. Report the exact versions of expo, react-native, expo-router, expo-video (if installed), expo-sqlite (if installed), @supabase/supabase-js and the JS engine (Hermes V1 or not).
2. If expo is 56.x, or 57.x below 57.0.17, propose an upgrade to the latest stable Expo SDK with npx expo install --fix. Reason: a Hermes V1 memory regression fixed in expo 57.0.17 matters on our 2 GB phones. Do not upgrade until I approve.
3. List what exists: routes in app/, files in src/domain with test counts, migrations, Edge Functions, scripts. Compare with runbook sessions S00 to S13 and list anything missing or different.
4. Write docs/architecture.md: one page, plain English, with the folder map, the data flow (phone database, outbox, Supabase, Edge Functions, Claude API, R2) and where each rule in CLAUDE.md is enforced.

Part B: Claude Code project setup
5. .claude/settings.json (committed):
   - permissions deny: git push --force, git push to main, supabase db reset, reading .env files, any command containing atlas-prod, rm -rf outside node_modules
   - a Stop hook (or the current equivalent; check the Claude Code hooks docs for the exact schema) that runs npm run typecheck and npm run lint and reports failures back
   - a hook that blocks edits to CLAUDE.md and specs/ unless the person said they are Bright
6. .claude/commands/ with these slash commands, using the exact text of the runbook's standard prompts, with $ARGUMENTS where the person's name, shift or session number goes:
   /start-shift (P1), /verify (P4), /review (P5: tell it to use read-only tools only), /pr (P6), /end-shift (P7), /session (opens a session: reads the session block from docs/runbook/<S number>.md and plans it).
7. docs/runbook/: one file per session S15 to S41, holding the session prompt text from the runbook doc. Bright will paste them in. Create empty files with headings now.

Part C: CI on every pull request
8. .github/workflows/ci.yml on pull_request to main: npm ci, typecheck, lint, test with coverage, content:check, a copy check (S17 adds the script; leave a step that is skipped until it exists).
9. Database tests in CI without touching atlas-dev: start the local Supabase stack with the Supabase CLI in the workflow, apply all migrations, run the seed, run npm run test:rls against it. If test:rls needs changes to accept a local URL, make them.
10. Coverage gate: src/domain at least 95% lines. Fail the build below that.
11. Tell me the exact GitHub settings to require the CI check before merging into main.

Part D: end-to-end test harness
12. Install Maestro locally (tell me the commands for Windows). Add .maestro/ with a README and a first flow signin.yaml: open app, type TEST-P1 code, type PIN, reach Home or onboarding.
13. Convention: every pressable and input gets a testID like "signin.code", "home.topic.materials". Add the testIDs the first flow needs.
14. eas.json profile e2e-test (APK, no credentials). .eas/workflows/e2e-android.yml that builds e2e-test and runs .maestro/ flows, triggered on pull requests with the label "e2e" (to save build minutes) and by hand. Note: the Maestro job on EAS is alpha. If it fails for platform reasons, we run flows locally on Phone A.

Commit in four commits, one per part.
```

**You check**

- Read Part A before approving anything else. If an SDK upgrade is proposed, approve it, then reinstall the dev build on both phones and re-run the S13 two-phone test.
- Type `/start-shift` in a new conversation. It runs the start-of-shift steps.
- Open a test pull request. The CI check runs and must pass before the merge button is enabled.
- Run `maestro test .maestro/signin.yaml` with Phone A plugged in. It passes.

**Done when**

- SDK confirmed safe or upgraded.
- Slash commands work. CI with local database tests is required on `main`.
- First Maestro flow passes on Phone A.

### S15. Phone database, outbox and sync engine

**Goal:** one durable local store for everything a pupil does, and one sync engine that sends it exactly once.

**Branch:** `feat/S15-local-data`

```text
Runbook session S15: phone database, outbox and sync engine. Read CLAUDE.md rules 5 and 8, specs/prd.md section 11 (Offline) and specs/data-model.md. Read docs/architecture.md.
Write the src/domain tests first, show them, wait for my OK, then build.

Build:
1. expo-sqlite as the phone database (src/data/db/). Versioned migrations using PRAGMA user_version, run at app start before the first screen. Tables at minimum:
   - outbox: id (uuid, the idempotency key), pupil_id, kind, payload json, created_at, attempt_count, next_attempt_at, last_error, status (pending, sending, done, dead)
   - local copies the app reads from: pupil_profile, segment_progress, attempts, overview_responses, exam_sittings, exam_answers, events (S17 uses it)
   - content cache tables (S20 fills them)
2. One write path, src/data/repo.ts: every pupil action writes its local row AND its outbox item in ONE SQLite transaction. The UI reads local rows only. No screen ever waits for the network to save.
3. Sync engine src/data/sync.ts:
   - runs on app start, when the app comes to the foreground, when the network returns (expo-network or NetInfo, pick one and say why), and every 60 seconds while open
   - sends per pupil, oldest first, in small batches, with backoff 10 s, 30 s, 2 min, 5 min, then every 10 min; marks dead after 50 tries and reports to Sentry
   - one sync at a time (a lock), safe if the app is killed mid-send
4. Server side: one Edge Function sync-push that accepts a batch of outbox items for the signed-in pupil, validates each kind with zod, and upserts by the client id. Add a migration giving every pupil-written table a unique client_id. A resent item changes nothing.
5. Shared phones: several pupils may use one phone. Each pupil's items must sync under that pupil's own session. Store each signed-in pupil's refresh token in expo-secure-store, keyed by pupil_id, used only by the sync engine. Remove it when the pupil's items are all done and they have signed out for 7 days, or when the admin resets the pupil.
6. src/domain/syncRules.ts: backoff, ordering, batch building, dead-item rule. Tests first, 100% coverage.
7. Repository tests: run the repo against a Node SQLite adapter behind the same interface, so Jest can test transactions.
8. A dev-only Sync screen: pending count per pupil, oldest item age, last error, "Sync now".
9. Move any earlier ad hoc queue (for example from S11 to S13) onto the outbox, and delete the old one.
```

**You check**

- Ask Claude for a dev action that writes 20 test events for TEST-P1. Airplane mode. Kill the app. Restart the phone. Sign in as TEST-P2, then turn the network on. Sign back in as TEST-P1. In the dashboard: exactly 20 rows under TEST-P1, none under TEST-P2.
- Repeat with the network turning off halfway through a sync. Still exactly 20.

**Done when**

- Kill, restart and pupil-switch tests pass with no loss and no duplicates.
- `syncRules` at 100% coverage.

### S16. AI gateway: one safe path for every AI job

**Goal:** every AI job in V1 goes through one tested gateway with schema-constrained output, limits, logging and safeguarding built in.

**Needs:** Bright has set `ANTHROPIC_API_KEY`, `SAFEGUARDING_EMAIL` and the email service key as Supabase secrets on atlas-dev (Claude gives the commands without values).

**Branch:** `feat/S16-ai-gateway`

```text
Runbook session S16: AI gateway. Read CLAUDE.md rules 1, 2, 3, 5, 9, 11, 13, 14, specs/prd.md sections 8 and 10, specs/ai-prompts.md.
Check the current Claude API docs for structured outputs (output_config.format with type json_schema) and its JSON Schema limitations, and confirm that claude-sonnet-5-5 and claude-haiku-5-5 support it. Tell me what you found before building.

Build supabase/functions/_shared/ai/:
1. jobs.ts: a registry of jobs (ai-overview, ai-check, ai-mark-theory, ai-read-handwriting). Each job has: model, prompt file, prompt version string, zod output schema, JSON schema made from the zod schema, max tokens, temperature 0.
2. prompts/: one markdown file per job, copied from specs/ai-prompts.md, with a version header. Prompt changes need Bright's approval.
3. gateway.ts, used by every job function:
   a. auth: the caller is that pupil, consent is recorded, the account is not locked
   b. privacy: never send name or class. Before sending, replace the pupil's own display name if it appears in their text with "[name]", and mask phone numbers and email addresses
   c. quota: an atomic SQL function ai_take_quota(pupil_id) that allows at most 120 calls per pupil per day (Africa/Accra day) and is safe under parallel calls. Over quota returns fallback reason daily_cap
   d. the call: Claude API with output_config.format json_schema; one 20-second limit across everything; one retry only on network error, 5xx or a zod failure; no retry on 429
   e. zod parses the result again; unknown misconception codes are dropped and logged
   f. logging: every attempt into ai_calls with job, model, prompt version, pupil_id, input (after masking), output, ok, reason, latency, input and output tokens
   g. safeguarding: every job schema has safeguarding { flag boolean, category one of harm_to_self, harm_from_others, distress, other }. When flag is true: write a safeguarding flag row and an alert_outbox row in one transaction
   h. returns { ok: true, data } or { ok: false, fallback: true, reason } where reason is timeout, bad_output, api_error, daily_cap, not_allowed
4. Alert sender: a function alert-send that sends pending alert_outbox rows by email (no pupil text, no name: only "A safeguarding flag needs review in the ATLAS dashboard", time and class). Called with EdgeRuntime.waitUntil right after the flag is written, and retried by a pg_cron schedule every 5 minutes. If pg_cron is not available on our plan, tell me, and also run the sender at the start of every gateway call.
5. App side, src/data/aiClient.ts: calls a job, 22-second client timeout, any network error becomes { fallback: true, reason: "offline" }, never throws to a screen. In development builds only, a forced verdict can be requested; the server refuses forcing unless its environment is dev.
6. scripts/aiEval.ts: a generic evaluation runner. Reads a CSV for a job, runs every row through the gateway on atlas-dev under an eval pupil id, compares with the expected columns, prints agreement and the disagreeing rows. S24 adds the ai-check set.
7. Tests with a fake Claude API: valid output, zod failure then fixed, zod failure twice, timeout, 429, 500, empty reply, quota at 119 and 120, parallel quota calls, name masking, safeguarding flag writes both rows, alert retried after an email failure.
No job function is built in this session except a tiny ai-ping job used by the tests.
```

**You check**

- Run the gateway tests. All cases pass.
- Call ai-ping with a text that contains TEST-P1's display name. In `ai_calls`, the input shows `[name]`.
- Call ai-ping with a forced safeguarding result. Bright receives the email within 2 minutes, with no name or text in it.

**Done when**

- All gateway failure tests pass.
- Quota, masking and the safeguarding email are proven.

### S17. Reliability layer: errors, telemetry, dev tools, accessibility kit

**Goal:** every screen built from now on gets calm errors, journey events, accessibility and a clean release build for free.

**Branch:** `feat/S17-reliability`

```text
Runbook session S17: reliability layer. Read CLAUDE.md (rules 6, 7, Look), specs/prd.md sections 11 and 12 (success measures), specs/framework.md (Data the app records).

Build:
1. Errors: a global error boundary plus one per route group. Fallback screen: "Something went wrong on this screen. Try again." with a retry that remounts the route, and a Sentry report. src/domain/errorCopy.ts maps every error kind (offline, timeout, server, storage full, unknown) to calm copy. Tests first.
2. Pupil copy lives only in src/copy/. A script npm run copy:check fails on "!", an em dash, the words wrong, failed, fail, incorrect, and any red colour value in the app. Turn on the CI step from S14.
3. Telemetry: src/data/events.ts writes journey events to the local events table and the outbox (S15), never free text. Event names: app_open, signin, notice_seen, onboarding_step, home_open, topic_download, video_start, video_pause, video_complete, watch_again, check_submitted, verdict_received, fallback_used, readback_edit, segment_complete, segment_moved_on, exam_start, exam_submit, results_open, mastery, recheck_start, recheck_result. Each has pupil_id, segment or item where relevant, ms durations, and app version. A server table events with RLS like attempts. S37 builds the pilot measures from it.
4. Sentry: release and dist set from the app version, breadcrumbs for navigation, a startup performance trace, and the beforeSend scrub from S03 kept.
5. Dev tools gate: all dev-only screens and buttons live in src/dev/ and are reachable only through one guard. A script scripts/checkReleaseBundle.ts exports a production bundle and fails if any src/dev code or the word "forceVerdict" is inside. Add it to CI.
6. Accessibility kit: shared components require accessibilityLabel in their TypeScript props; touch targets at least 48 dp; a dev screen showing every component at font scale 1.3 and with reduced motion. Fix any clipping now.
7. Performance baseline on Phone A: cold start, Home render, memory after 10 minutes. Write the numbers in docs/perf-baseline.md. Every later session must not make them worse by more than 10% without a note.
```

**You check**

- Add an exclamation mark to any string in `src/copy/` on a scratch branch. CI fails. Throw the branch away.
- Use the app for 5 minutes. In the dashboard, the `events` table shows your journey in order.
- Set Phone A's font size to the largest. Open every screen built so far. Nothing is cut off.

**Done when (Foundations gate)**

- CI green with copy, bundle and RLS checks.
- Events arrive in order.
- Performance baseline recorded.

## B3 Onboarding and B4 Home: S18 to S19 (28 to 29 Nov)

From here, every feature session follows the same build standard. Paste this block once at the top of each feature session, or put it in `docs/runbook/standard.md` and have `/session` include it.

```text
Build standard for this session (from the runbook, Phase F):
- Every pupil action saves through src/data/repo.ts (local row plus outbox in one transaction). No screen waits for the network to save.
- Every AI call goes through src/data/aiClient.ts and the S16 gateway. Every fallback shows tap options.
- Every screen sits inside the S17 error boundary, uses copy only from src/copy/, and logs its journey events.
- Every pressable and input has a testID and an accessibilityLabel. Touch targets at least 48 dp. Works at font scale 1.3 and with reduced motion.
- Rules go in src/domain with tests written first.
- Add or extend a Maestro flow in .maestro/ for this session's main path, and run it on Phone A.
- Check docs/perf-baseline.md: no screen more than 10% slower without a note.
```

### S18. Onboarding

**Goal:** four playful screens that learn who the pupil is, finished in under 3 minutes, resumable, nothing marked right or wrong.

**Branch:** `feat/S18-onboarding`

```text
Runbook session S18: onboarding. Apply the build standard. Read specs/framework.md stage 1, specs/prd.md FR-5 to FR-7, specs/B3.md, CLAUDE.md rules 2, 6, 7.

1. src/domain/onboarding.ts, tests first: which screen comes next from saved answers; validation of the name (1 to 20 characters, letters, spaces, hyphens, apostrophes); interests 1 to 4 from the fixed list.
2. app/onboarding/, four screens with a quiet progress line of 4 dots (no numbers):
   a. "What should I call you?" TextField. Stored locally and in pupils. Never sent to AI.
   b. "Which class are you in?" pills Basic 7, Basic 8, Basic 9; Basic 7 preselected.
   c. "What do you enjoy? Pick up to 4." pill toggles: football, music, farming, stories, cooking, market, animals, phones and computers. A 5th pick says "You can pick up to 4."
   d. Three "would you rather" cards one at a time, texts in src/copy/onboarding.ts for Bright to replace:
      "Would you rather fix a broken radio, or find out why it broke?"
      "Would you rather plant a new farm, or sell at the market?"
      "Would you rather learn a new song, or write a new story?"
      Record choice, time to choose in ms, and whether the pupil changed their mind before confirming.
   e. "Thank you, <name>. Let's start." PillButton "Go to my lessons".
3. Each answer saves the moment it is given through repo.ts. Reopening resumes at the first unanswered screen.
4. Events: onboarding_step with step and duration.
5. Maestro flow onboarding.yaml: full run, then a run that kills the app on screen 3 and checks it resumes on screen 3.
```

**You check**

- Stopwatch a full run on Phone A at a child's reading pace. Under 3 minutes.
- Kill the app on screen 3, reopen, sign in. Screen 3, earlier answers kept.
- Do it all in airplane mode, then turn the network on. `pupil_profiles` fills in.
- Try it with TalkBack on. Every control is read out with a sensible label.

**Done when (B3 gate)**

- Under 3 minutes, resumable, every answer saved, Maestro flows pass.

### S19. Home: Recommended and Choose a topic

**Goal:** a calm Home that always opens instantly from the phone, with a prerequisite nudge that never blocks.

**Branch:** `feat/S19-home`

```text
Runbook session S19: Home. Apply the build standard. Read specs/framework.md stage 2, specs/prd.md FR-8 and FR-9, specs/B4.md.

1. src/domain/recommendations.ts, tests first: builds the Recommended list in this order: a due re-check (S34 fills the data), segments waiting to be re-taught (moved_on, or missed in a re-check, or lost marks in an exam), then topics the teacher set for the class. No duplicates. Each item carries a reason string for the card, for example "Waiting for you" or "Your class is learning this".
2. src/domain/prerequisites.ts, tests first with fake topic data: returns ok, or missing topics with a reason.
3. app/home/index.tsx reads only from the phone database and refreshes in the background:
   - "Hello, <name>."
   - "Recommended for you": cards from recommendations.ts
   - "Choose a topic": Science, then its topics; Mathematics shown as "Coming soon", not tappable
   - topic cards: title, "5 parts", a quiet line of 5 dots for parts done, and "Mastered" in teal after mastery. No percentages, no stars.
4. Prerequisite sheet when missing: "I'd suggest this first, here's why." + reason + button to the missing topic + secondary "Take me to the class topic anyway", which always opens the topic.
5. A dev-only switch (in src/dev) that gives Materials a fake prerequisite, so the sheet can be seen on a phone.
6. Events: home_open.
7. Maestro flow home.yaml: open the topic from both sections; with the dev switch on, open the topic through "anyway".
```

**You check**

- Both sections open the topic on Phone A.
- Dev switch on: the nudge shows, and "Take me to the class topic anyway" opens the topic.
- Airplane mode, kill and reopen the app. Home shows at once.

**Done when (B4 gate)**

- Both sections open the topic. Nudge tested in Jest, Maestro and by hand. Never blocks.

## B5 Topic, video and overview: S20 to S22 (29 to 30 Nov)

B5 is done when the whole overview works in airplane mode after one download, and the profile updates when the network returns.

You need at least one real test video set on R2: `mat-OV-a-360.mp4`, its poster JPEG and its `.vtt` file. If the producer has not delivered, Bright makes a 30-second clip on a `#F6F0E6` background with handwriting and narration, plus a 3-line `.vtt`.

### S20. Topic download, content cache, storage and data size

**Goal:** one download puts everything a topic needs on the phone, and the app reads content only from the phone after that.

**Branch:** `feat/S20-topic-download`

```text
Runbook session S20: topic download and content cache. Apply the build standard. Read specs/prd.md section 11 (Offline, Data use), specs/video-board.md sections 2, 3 (P3) and 5, specs/B5.md, docs/architecture.md.

1. Content sync: fetch the topic's content (segments, versions, check questions, worked-example cards, re-check items, exam items WITHOUT answers through the S06 safe function) into the S15 content cache tables, keyed by the topic's content version string. Re-fetch only when the version changes.
2. Media download with the current expo-file-system API (check the docs for the SDK we use): every video at 360p, poster, .vtt file and worked-example photo, into the app's document folder. One file at a time, resumable after a lost connection, size checked against Content-Length, temp file renamed only when complete. A manifest table records each file, its size and the content version.
3. src/domain/downloadPlan.ts, tests first: given the manifest and the new content, which files to fetch, keep or delete. Old files from a previous content version are deleted after the new ones are complete.
4. Download screen (topic opens it when not ready): "This topic needs <n.n> MB of data. Download it now, on Wi-Fi if you can." Progress "<n> of <total> files". Cancel and resume. Storage check first: if free space is below need plus 50 MB, "This phone needs <n> MB more space. Ask your teacher for help."
5. Phone preparation for the pilot: an admin-only action "Prepare this phone" (reached by a staff PIN from the sign-in screen, set by Bright in the dashboard later; for now a dev setting) that downloads every topic file before any pupil signs in. Files are shared by all pupils on the phone.
6. Data measurement: count bytes for content, media and API per topic; write to the events log (topic_download with bytes and seconds).
7. Maestro flow download.yaml: download with the network on, then airplane mode, then open the topic.
```

**You check**

- Turn the network off halfway through a download, then on. It resumes, it does not restart.
- After download, airplane mode, kill and reopen. The topic and its parts all open.
- The size shown before download matches the real total within 5%.

**Done when**

- Resumable download, content read only from the phone, storage check and size proven.

### S21. Board video player

**Goal:** the lesson video looks like a page being written on, never like a video player, and meets every rule in `specs/video-board.md`.

**Branch:** `feat/S21-board-player`

```text
Runbook session S21: board video player. Apply the build standard. Read specs/video-board.md completely (P1 to P10 and Done when) and CLAUDE.md (Lesson video player). Check the current expo-video docs for the SDK we use before planning.

Build src/components/board/BoardVideo.tsx with expo-video:
1. Player setup: useVideoPlayer with the local file URI from the S20 manifest. VideoView with nativeControls={false}. Do NOT enable supportsPictureInPicture or supportsBackgroundPlayback in the config plugin; allowsPictureInPicture false, staysActiveInBackground false, showNowPlayingNotification false. Fullscreen not offered.
2. P1 no chrome: nothing but the picture. Wrap in a Pressable that handles tap (P5) and swallows long-press, so no system menu appears.
3. P2 seamless edge: the container background is the version's boardColour; a soft 4% fade at each edge drawn over the video. On Android, try surfaceType="textureView" so the fade and the pause dim layer draw over the video correctly; if it costs smoothness on Phone A, explain the trade-off and propose the fix.
4. P3 poster: show the poster image over the video until the player status is ready and playing has started; useExoShutter stays false.
5. P4 autoplay with sound; if the phone blocks sound, play muted with a "Tap for sound" pill and unmute on first touch without restarting.
6. P5 tap pauses or continues; paused dims the board slightly and shows "tap to continue" in Caveat 700.
7. P6 pause when the app leaves the foreground (AppState) and when less than half of the board is visible in the scroll view; resume only if the pupil had not paused it.
8. P7 captions: set player.timeUpdateEventInterval to 0.1 and pick the cue for currentTime from the parsed .vtt (src/domain/vtt.ts, tests first: timestamps, multi-line cues, gaps, overlapping cues). Show the cue under the board. Captions are also readable by TalkBack.
9. P8 on playToEnd: the last frame stays; onEnded fires so the parent fades in the next section and scrolls to it.
10. P9 Watch again: seek to 0, play, scroll back to the board; does not count as a try. Log watch_again.
11. P10 header above the board: breadcrumb "Basic 7 Science · Materials", title, journey label.
12. Switching version (for a retry) reuses the same player with replace, not a new player. Release any player created outside the hook on unmount. Log video_start, video_pause, video_complete with positions.
13. Accessibility: the board has the label "Lesson video. Tap to pause or continue."
14. A dev screen in src/dev to play any downloaded version.
Measure memory on Phone A after playing 5 videos in a row. Write it in docs/perf-baseline.md.
```

**You check** (the `specs/video-board.md` Done when list, on both phones)

- Look hard at the board edge in daylight. No line between video and screen.
- Long-press the video. Nothing appears.
- Home button during play: paused on return. Scroll half the board away: it pauses.
- Captions match the voice within half a second on 3 checked lines.
- Airplane mode: poster, captions and end state all work.
- Play 5 videos in a row on Phone A. No stutter, no crash, memory written down.

**Done when**

- Every `specs/video-board.md` Done when line proven on both phones. `vtt` tests pass.

### S22. Overview and the ai-overview job

**Goal:** after the overview video, the pupil says what they took from it. The AI listens to build the profile. It is never a grade.

**Branch:** `feat/S22-overview`

```text
Runbook session S22: overview and ai-overview. Apply the build standard. Read specs/framework.md stage 3, specs/prd.md FR-10 to FR-13, specs/ai-prompts.md (overview listening), specs/B5.md.

1. Job ai-overview in the S16 registry: model claude-haiku-5-5. Input: the two texts (each up to 600 characters, either may be empty) plus the topic's segment codes and titles. Output schema: { keywords: string[] (max 10), interests: string[] from the fixed interest list only, confusions: string[] (max 5, short), segmentsMentioned: codes OV and 1A to 1E only, safeguarding }.
2. Overview screen in app/topic/[id].tsx: BoardVideo with the overview. On end, fade in below the board:
   "Tell a friend what this video was about, in one or two sentences." multi-line TextField
   "Which part felt confusing?" multi-line TextField
   PillButton "Send", quiet "Skip", and "Watch again".
3. On Send or Skip: save overview_responses through repo.ts first, then call the job. Whatever happens, the pupil sees "Thanks. That helps me choose how to teach this." and continues to part 1A. Offline or fallback: the outbox sends the job later during sync (outbox kind ai_overview), and the result updates pupil_profiles when it arrives.
4. Safeguarding true: the pupil sees "Thank you for sharing. A teacher may check in with you." instead of the thanks line; the gateway has already raised the flag and the alert.
5. src/domain/profileMerge.ts, tests first: merge keywords, interests and confusions into the profile without duplicates, newest first, capped lengths.
6. Maestro flow overview.yaml: watch (dev: skip to end), type two sentences, send, reach 1A. Second run in airplane mode.
```

**You check**

- Send two real sentences on Phone A. `pupil_profiles` gains keywords. `ai_calls` shows the prompt version and no name.
- Repeat in airplane mode. The thanks line shows at once. Turn the network on. The profile updates within a minute.
- Type the pupil's own name in the answer. `ai_calls` input shows `[name]`.

**Done when (B5 gate)**

- Overview works offline after download. Profile updates when the network returns. Nothing looks like a grade.

## B6 Segment loop: S23 to S29 (30 Nov to 3 Dec)

B6 is done when every rule is unit tested, every path is covered by a Maestro flow, and the Sprint 1 demo runs the whole learner flow on Phone A. This is the heart of ATLAS.

| Result of a try | What happens |
| --- | --- |
| Answer correct and reasoning sound | Segment complete. "Well reasoned." |
| Anything else | One try used. Before tries 2 and 3, `routing.ts` picks the next unseen version by misconception. None left: worked-example card |
| Right answer, wrong reason | Logged as a lucky guess or hidden misconception |
| Sure and wrong | Logged as a misconception. The next version opens with a line that tests the idea (conflict and repair) |
| Not sure and right | Logged as fragile knowledge |
| Either verdict "unsure" | Tie-break with the read-back and tap reasons. Borderline flag to the admin |
| Third failed try | "We'll come back to this one. You're not behind." Stalled flag. Segment to Recommended. Move on |

### S23. Learning rules: routing, tries, confidence, tie-break

**Goal:** every learning decision in the loop is a tested pure rule. No screens.

**Branch:** `feat/S23-learning-rules`

```text
Runbook session S23: learning rules. Read specs/prd.md 6.5, 6.6 and 8.2, specs/framework.md stages 1, 4 and 5, specs/B6.md, CLAUDE.md rules 4 and 10.
Pure TypeScript in src/domain only. Write all tests first, show me the test names, wait for my OK, then write the code. 100% line and branch coverage.

1. routing.ts
   chooseFirstVersion(versions, profile): most overlap between interestTags and the pupil's interests plus overview keywords; tie: version a.
   chooseNextVersion(versions, seenLabels, codes, profile): unseen version matching the most misconception codes; tie: interest overlap; tie: label order; none unseen: { kind: "workedExample" }.
   Codes are the union of answer and reason codes, without duplicates.
2. tries.ts: a reducer over { status, triesUsed, versionsSeen, lastCodes } with events started, attemptJudged, movedOn, returnedLater. Max 3 tries. Effects returned, never performed: raiseStalledFlag, clearStalledFlag, addToRecommended, logLuckyGuess, logMisconception, logFragile. returnedLater starts 3 fresh tries and keeps versionsSeen. Impossible events are rejected.
3. confidence.ts: classify each judged attempt as solid, lucky_guess, misconception (sure and wrong), fragile (not sure and right) or gap (not sure and wrong). Baseline: the framework says the app learns each child's confidence habit before trusting it. trustConfidence(history) is false until the pupil has 5 judged attempts; until then misconception and fragile are logged but do not change routing or messages.
4. tieBreak.ts: turns "unsure" verdicts plus the pupil's taps into yes or no, and says whether a borderline flag is needed.
5. repairLine.ts: when an attempt is a trusted misconception, returns the opening line for the next version: "Here's a case to test that idea." Otherwise "Let's look at it another way."
Tests must cover every row of the outcome table in the runbook, plus confidence before and after 5 attempts.
```

**You check**

- Read the test names before the code is written. Every row of the outcome table has a test.
- Coverage report: 100% for all five files.

**Done when**

- All learning rules pass with 100% coverage.

### S24. The ai-check job and its evaluation set

**Goal:** a server judge of answer and reason that is fast, private and measured from day one.

**Needs:** Bright and the content reviewer have started `content-work/eval/ai-check.csv` with at least 30 rows. It grows to 100 for the 7 Dec quality gate.

**Branch:** `feat/S24-ai-check`

```text
Runbook session S24: ai-check and its evaluation. Apply the build standard. Read specs/prd.md FR-15 to FR-17, FR-21, FR-22 and 8.4, specs/ai-prompts.md (answer and reason check), specs/framework.md (The AI check, The reasoning check).

1. Job ai-check in the S16 registry, model claude-sonnet-5-5. The client sends only ids and the pupil's texts: { segment_code, try_number, question_id, answer_text, answer_mode, reason_text, reason_mode, sure }. The server loads the question, accepted answers, reference meaning, reference reasoning and the misconception list from the database.
2. Output schema: { answerCorrect: yes|no|unsure, reasoningSound: yes|no|unsure, misconceptionCodes: codes from this segment only, readBack: one sentence, max 200 characters, second person, starting "You think" or "You said", safeguarding }.
3. No AI when it is not needed: tap answers are judged by matching accepted answers; tap reasons map straight to sound or their misconception code; if both are taps, build the read-back from the chosen texts and make no call. Questions marked tapOnly never call the AI and hide typing.
4. Add tapOnly to the content schema and database (a migration plus a zod field, default false). Bright sets it per question after the quality gate.
5. Evaluation: content-work/eval/ai-check.csv columns id, segment, try, answer, reason, expected_answer, expected_reasoning, expected_codes, source (adult or pupil). Run with npm run eval:check through scripts/aiEval.ts. Print: answer agreement %, reasoning agreement %, a 3 by 3 table for each, code precision, unsure rate, median and slowest latency, per-question results, and PASS if answer >= 85% and reasoning >= 80% (PRD 8.4). Save results to content-work/eval/results/<date>-<prompt version>.csv. These files are git-ignored.
6. Run the eval on the rows that exist. Report the numbers and the 5 worst disagreements with your reading of why.
```

**You check**

- Run `npm run eval:check` yourself. Write the two agreement numbers and the prompt version in the shift log.
- Read the 5 worst disagreements with Bright or the reviewer. Decide: fix the prompt (Bright), fix the reference reasoning (content), or mark the question tapOnly.
- A tap-only attempt leaves no new row in `ai_calls`.

**Done when**

- ai-check returns the schema every time. The eval runs with one command and reports agreement.

### S25. Attempts, segment progress and flags

**Goal:** every try is saved with every field, and the rules' effects become real rows, safely.

**Branch:** `feat/S25-attempts`

```text
Runbook session S25: attempts, progress and flags. Apply the build standard. Read specs/prd.md FR-23 to FR-26, specs/data-model.md (segment_progress, attempts, flags).

1. src/data/segmentRepo.ts on top of repo.ts: load progress, save each state change, insert attempts. Each attempt stores every FR-23 field plus: confidence class (S23), fallback reason if any, read-back confirmed or edited, prompt version.
2. A hook useSegment(code) that runs the tries reducer and performs its effects through the repository.
3. Flags are never written by the phone directly. sync-push (S15) validates an attempt batch on the server, recomputes the tries state from the pupil's stored attempts, and only then writes stalled flags, clears them, and writes borderline flags. A forged batch cannot raise or clear a flag the attempts do not justify. Add server tests for this.
4. Recommended entries come from progress and results through recommendations.ts (S19), not a separate list.
5. Events: check_submitted, verdict_received, fallback_used, segment_complete, segment_moved_on.
6. Jest tests for effect handling with a fake repository; server tests for flag recomputation.
```

**You check**

- Run a scripted attempt for TEST-P1. One attempt row with every field filled.
- Send the same batch twice. Still one row.
- Ask Claude to send a forged batch claiming a stalled flag with only one failed try. The server refuses to write the flag.

**Done when**

- Every FR-23 field saved. Flags only from server-checked attempts.

### S26. Segment screen: video and "Your turn"

**Goal:** the pupil watches the right version, then answers by typing or tapping, on one calm scrolling screen.

**Branch:** `feat/S26-segment-screen`

```text
Runbook session S26: segment screen part 1. Apply the build standard. Read specs/video-board.md section 4, specs/framework.md stage 4, specs/prd.md FR-14 and FR-15, specs/B6.md. The video player follows specs/video-board.md.

Build app/segment/[id].tsx as one scrolling screen:
1. Header (P10) with "Part <n> of 5".
2. BoardVideo with the version from routing.ts.
3. On video end: "Your turn" in Caveat 700, then the question for this try, scrolled into view. The question for try 2 and try 3 is always that try's question.
4. Answer: multi-line TextField first, hint "Type your answer"; a text button "Choose an answer instead" shows the 3 tap options; the pupil can switch back. tapOnly questions show taps only.
5. Track time from question shown, and whether the answer changed (typing edits after a pause, or a different tap).
6. Kill and reopen mid-question: return to the same try and version with the typed draft kept (drafts save locally every few seconds).
7. "Watch again" (P9) does not use a try.
8. PillButton "Next" when an answer exists.
No right or wrong is shown on this screen. No red.
```

**You check**

- Open 1A on Phone A. Video ends, "Your turn" fades in and scrolls into view.
- Type half an answer, kill the app, reopen. The draft is still there.
- Switch between typing and taps.

**Done when**

- Video to question works on both phones, drafts survive a kill.

### S27. Sure or not sure, "Why do you think so?", read-back

**Goal:** every answer gets a confidence tap and a reason, then a check the pupil can see and correct once.

**Branch:** `feat/S27-why-readback`

```text
Runbook session S27: confidence, reason, check and read-back. Apply the build standard. Read specs/prd.md FR-15 to FR-18 and FR-22, specs/framework.md (The reasoning check).

1. After Next: "How sure are you?" pills "Sure" and "Not sure". Required.
2. "Why do you think so?" every time. TextField first; "Choose a reason instead" shows the 3 reason options. PillButton "Check my thinking".
3. Save the attempt locally first, then call ai-check through aiClient. While waiting, LoadingCalm "Reading your answer".
4. Fallback of any reason: "I could not check that just now. Pick the one closest to what you meant." then the tap answer options (if the answer was typed) and the tap reason options, judged on the phone. The typed text is queued and checked later for the record and for safeguarding only.
5. Read-back: "Here's what I understood: <readBack> Is that right?" pills "Yes" and "Not quite". Not quite allows one edit of the reason and one re-check, then the second result stands.
6. Unsure: tieBreak.ts asks "Which of these is closest to what you meant?" and decides; a borderline flag follows through sync.
7. Safeguarding: "Thank you for sharing. A teacher may check in with you." No verdict for this answer and no try used; the pupil carries on with the same try.
8. Final yes or no verdicts go to the tries reducer.
Maestro flow segment-check.yaml with dev forced verdicts for each branch.
```

**You check**

- For 1B, type a right answer with the reason "Iron is strong because it is heavy". The read-back states that idea. A try is used.
- "Not quite", edit, re-check. Only one edit allowed.
- Airplane mode, check. Tap fallback appears at once (no 20-second wait when the phone knows it is offline).

**Done when**

- Every branch reachable on a phone. Fallback never traps the pupil.

### S28. Outcomes, worked example, move on, return later

**Goal:** what the pupil sees after each judged try, through to the 3-try ceiling and the return from Recommended.

**Branch:** `feat/S28-outcomes`

```text
Runbook session S28: outcomes. Apply the build standard. Read specs/prd.md FR-19 to FR-26, specs/framework.md stage 5, CLAUDE.md rules 6 and 7.

1. Complete: a calm card "Well reasoned." plus one sentence of the reference reasoning; "Next part" goes to the next segment, or to the exam unlock screen after the last segment.
2. Try used: the line from repairLine.ts, then the next version plays on the same screen (scroll to the board), then the next try's question.
3. No unseen version: the worked-example card (text under 120 words plus photo, in a Card), then the next try's question.
4. Third failed try: "We'll come back to this one. You're not behind." and "Next part".
5. Return from Recommended: "Waiting for you" card opens the segment with 3 fresh tries, unseen versions first. Completing it clears the stalled flag through sync.
6. Topic screen shows each part quietly: done, in progress, waiting for you. No ticks in red or green.
7. The exam unlock screen is a placeholder until S31.
```

**You check**

- Fail 1A three times on Phone A. You see the second version with its opening line, then the worked example, then the kind message. Home shows 1A under Recommended. A stalled flag exists.
- Open 1A from Recommended and answer well. The flag shows cleared.

**Done when**

- All outcomes seen on a phone, and the flag clears only by the pupil's success.

### S29. Every path tested, and the Sprint 1 demo

**Goal:** every path of the loop is covered by an automated flow and ticked by hand on both phones.

**Branch:** `feat/S29-path-tests`

```text
Runbook session S29: path tests. Apply the build standard. Read specs/B6.md, docs/path-checklist.md, the outcome table in the runbook.

1. Maestro flows in .maestro/segment/, one per path, using dev forced verdicts in the e2e-test build only: complete first try; complete on try 3; three failures then move on; lucky guess; misconception after the baseline; fragile; unsure answer; unsure reasoning; read-back edit; fallback; offline; safeguarding; return from Recommended; kill mid-question.
2. The e2e-test build profile enables dev tools; preview and production never do. scripts/checkReleaseBundle.ts (S17) runs on both release profiles in CI.
3. docs/path-checklist.md: every flow above as a row, with Phone A result, Phone B result, date and tester.
4. Fix everything the flows find before the PR.
```

**You check**

- Run all segment flows on Phone A: `maestro test .maestro/segment/`. All pass.
- Fill in `docs/path-checklist.md` by hand on Phone B.
- **Sprint 1 demo with Bright:** sign in, onboarding, overview, all 5 parts with at least one retry, reach the exam unlock screen. Note every hesitation.

**Done when (B6 gate)**

- All learning rule tests pass. Every path has a passing flow and a hand tick on both phones. No dev tools in release bundles.

## B8 Exam: S30 to S33 (3 to 5 Dec)

B8 is done when the paper hands itself in at zero even after an app restart or a wrong phone clock, offline included, and the results match a teacher's hand-marked copy. Exam length is Bright's decision (draft: 10 objective, 3 theory). Until then the app reads `durationMinutes` from the content.

### S30. Exam rules: timer, scoring, unlock

**Goal:** a timer nobody can reset or stretch, and scoring that matches the scheme exactly.

**Branch:** `feat/S30-exam-rules`

```text
Runbook session S30: exam rules. Read specs/prd.md FR-27 to FR-30, specs/framework.md stage 6, specs/B8.md, CLAUDE.md rule 10.
Pure TypeScript in src/domain. Tests first, show the names, wait for my OK. 100% coverage.

1. examTimer.ts: remaining(startedAt, durationSeconds, now) never below 0. The start time is the server's, fetched when "Start exam" is tapped; if offline, the phone's monotonic clock since app start is used and the server reconciles on submit. A phone clock changed by hours does not change time left. Tests: normal; app closed 5 minutes; reopened after time is over; clock moved forward and back; offline start.
2. scoring.ts: objective marks; theory marks as the sum of awarded scheme points capped at the item's max; total and whole-number percentage rounded down; provisional flag if any theory mark awaits approval.
3. examUnlock.ts: unlocked when every segment is complete or moved on.
4. paperChoice.ts: first sitting Paper A, second Paper B, third and later Paper A in a new fixed order with repeatPaper true.
```

**You check**

- The test names include the clock-change and offline-start cases.

**Done when**

- All exam rules pass at 100% coverage.

### S31. Exam screens

**Goal:** a real exam with the app as a calm invigilator.

**Branch:** `feat/S31-exam-screens`

```text
Runbook session S31: exam screens. Apply the build standard. Read specs/prd.md FR-27 to FR-29, specs/framework.md stage 6, specs/B8.md. CLAUDE.md rule 6 allows a timer only here.

1. Unlock screen: "You have worked through every part. When you are ready, you can take the topic exam." Rules card: questions per section, time, "You can move between questions in a section", "You will see your results after you finish", "When time is up, a sound plays and your paper is handed in". PillButton "Start exam".
2. Start: create the sitting through repo.ts with the paper from paperChoice.ts; items come from the phone cache, without answers.
3. Objective section: one question per screen, 4 option pills, Previous, Next, question dots to jump. Then "Go to the theory section", with a note that objective answers are then closed.
4. Theory section: one question per screen, multi-line TextField, marks shown.
5. Every answer saves locally as it changes (debounced to about 1 second) and queues through the outbox.
6. Timer always visible, IBM Plex Mono, ink colour, no flashing, no colour change, no ticking.
7. At zero: a short stop-work sound (our own or royalty-free, licence noted in docs/licences.md), "Time is up. Your paper has been handed in.", submit. Reopened after time ran out: submit at once.
8. "Hand in my paper" with a confirm sheet showing the number unanswered.
9. Back button during the exam: "Leave the exam? Your time keeps running."
10. Offline submit: "Your paper is saved. Results will show when you are back online."
11. No feedback of any kind before submission.
12. Maestro flow exam.yaml with a 2-minute dev duration: answer some, kill the app, wait, reopen, confirm auto-submit.
```

**You check**

- 3-minute exam on Phone A. Kill the app, wait 4 minutes, reopen. The paper is handed in at once.
- Move the phone clock 1 hour during an exam. Time left does not jump.
- Run an exam fully in airplane mode. The "saved" message shows; results arrive when online.

**Done when**

- Auto-submit proven after restart, clock change and offline.

### S32. Submit, theory marking, borderline

**Goal:** the server marks every paper, theory answers against scheme points, with doubtful marks held for a teacher.

**Branch:** `feat/S32-marking`

```text
Runbook session S32: submit and theory marking. Apply the build standard. Read specs/prd.md FR-30 and 8.4, specs/framework.md (AI marking of theory answers), specs/ai-prompts.md (theory marking).

1. submit-exam (Edge Function, also reached through sync-push for offline papers): checks the time on the server, marks objective items with scoring.ts (never trusting the phone), then runs ai-mark-theory for each theory answer through the gateway, then writes the total and the provisional flag. Idempotent by sitting id.
2. Job ai-mark-theory, model claude-sonnet-5-5. Input: question, scheme points with marks, the pupil's answer. Output: { points: [{ index, awarded, evidence (a short quote from the answer, or empty) }], borderline, credited, missing, safeguarding }.
3. Borderline also when: the answer is under 5 words but not empty; any awarded point has empty evidence; the gateway fell back (then 0 provisional marks).
4. Mark once and store. Never re-mark automatically, so the same answer keeps the same mark.
5. Evaluation: content-work/eval/ai-mark-theory.csv (id, question, answer, expected marks per point) and npm run eval:theory. Report exact-match rate per point, total-mark agreement, and borderline rate.
6. scripts/approveMark.ts for testing until the dashboard (S36) exists. Approval recalculates the total and re-runs mastery (S34 will plug in here).
```

**You check**

- Run `npm run eval:theory` on at least 12 hand-marked answers. Write the agreement in the shift log.
- Submit a paper with a 3-word theory answer. It is held as borderline.

**Done when**

- Server marking is idempotent and matches the scheme. Theory evaluation runs with one command.

### S33. Results and retake

**Goal:** results that teach, and a fair retake.

**Branch:** `feat/S33-results`

```text
Runbook session S33: results and retake. Apply the build standard. Read specs/prd.md FR-31 and FR-32, specs/framework.md stage 7.

1. Results come from the server after marking (the phone never held the answers): "You scored <marks> out of <max>." If provisional: "Some answers are being checked by a teacher. Your score may go up."
2. One Card per question where marks were lost: the question, the pupil's answer, "What you got credit for", "What was missing", "A good answer", and "Watch part <code> again". Wrong options in inkSoft, correct in teal. Never red.
3. Buttons: "Revise weak parts" (adds those segments to Recommended through recommendations.ts) and "Retake now" (paperChoice.ts).
4. If a retake without revision did not improve: once, "It might help to look at <parts> again before your next try."
5. Events results_open and exam_submit with score.
6. docs/test-script.md: "Exam hand-mark check" steps for the content reviewer.
```

**You check**

- Finish a full paper as TEST-P1. The content reviewer marks a printed copy by hand. Every objective mark matches. Every theory mark matches or is held as borderline.
- "Retake now" serves Paper B.

**Done when (B8 gate)**

- Auto-submit proven. Results match the hand-marked copy. Retake uses Paper B.

## B9 Mastery and re-check: S34 (5 Dec)

B9 is done when the pass, not-yet, approval and re-check paths are all tested on a phone. The 80% threshold and the re-check pass rule are drafts, each held in one constant Bright can change.

### S34. Mastery and spaced re-check

**Goal:** mastery is decided by the rule on the server, celebrated calmly, and confirmed 3 days later.

**Branch:** `feat/S34-mastery`

```text
Runbook session S34: mastery and re-check. Apply the build standard. Read specs/prd.md FR-33 to FR-35, specs/framework.md stage 8, specs/B9.md.

1. src/domain/mastery.ts, tests first, 100% coverage:
   MASTERY_THRESHOLD = 80 and RECHECK_PASS = 2 (of 3), each with a comment that Bright sets the final value with teachers.
   isMastered: percent >= threshold, no provisional marks, no segment still moved_on with an open stalled flag.
   recheckDueAt: 3 days after mastery, start of that day, Africa/Accra.
   recheckResult: pass when at least RECHECK_PASS items have a correct answer and sound reasoning.
2. Mastery is decided on the server after marking and again after each borderline approval (S32 hook). It writes mastery_records.
3. Celebration, once: "You have mastered Materials." then "You worked through every part and explained your thinking." A still tick drawn in the board style, or a short stroke that respects reduced motion. "Back to my lessons". No confetti, badge, points or sound.
4. Re-check: when due, before Home: "Quick check on Materials. 3 questions. It takes about 2 minutes." with "Start" and "Later today" (returns after 4 hours, and sits first in Recommended). The 3 items use the same answer, sure, why and ai-check path as the segment loop, with every fallback.
5. Pass: "Your learning has stayed with you. Well done for coming back to it." Miss: "Let's look at a few parts again." Mastery quietly set back, missed items' segments to Recommended. No score, no "failed".
6. Home shows "Mastered" in teal text. Nothing is ever locked.
7. Dev-only "Make re-check due now" in src/dev.
8. Maestro flows mastery.yaml and recheck.yaml (pass and miss).
```

**You check**

- TEST-P1 reaches 80% with no stalled part: the celebration shows once.
- TEST-P2 reaches 85% with a part still moved on: no celebration.
- Approve a borderline mark that lifts a pupil over 80%: mastery appears.
- "Make re-check due now": pass it as one pupil, miss it as another. Check the messages and Recommended.

**Done when (B9 gate)**

- Pass, not-yet, approval and re-check paths proven on a phone and in Maestro.

## B10 Dashboard: S35 to S37 (5 to 6 Dec)

B10 is done when Bright handles a safeguarding flag, clears a stalled flag and approves a mark from a laptop, the pilot measures show live, and a teacher sees only their own class. All dashboard numbers come from SQL views with Row Level Security, never computed in the browser.

### S35. Admin web: sign-in, classes, pupils, consent, phones

**Goal:** Bright runs the pilot class from a laptop.

**Branch:** `feat/S35-admin-shell`

```text
Runbook session S35: admin web. Apply the build standard (web: keyboard focus visible, works at 1280 px and on a tablet). Read specs/prd.md section 9 and FR-1, FR-4, specs/B10.md.

1. app/admin/ for Expo web only; the routes do not exist in the Android build.
2. Staff sign-in by email magic link. Only staff profiles get in. Pupils see "This page is for teachers."
3. Laptop layout: left menu (Flags, Progress, Pupils, Classes, AI, Phones), signed-in-as line. Paper and ink look, 1px line borders, no shadows.
4. Classes: list, create, edit, assign teacher.
5. Pupils per class: add one or paste a list of first names; codes from pupilCode.ts; "Print code sheet" (same sheet as S13); reset PIN; unlock code.
6. Consent per pupil: consent date, form reference, withdraw. Withdrawal returns the pupil to the waiting screen at the next sign-in.
7. Phones: set the staff PIN used by "Prepare this phone" (S20); list phones that have synced recently with app version and pending outbox count (sent with each sync).
8. An audit table for every admin action (who, what, when, no pupil text).
9. Deploy the web export to a static host (EAS Hosting or Cloudflare Pages; say which and what Bright must set up). atlas-dev only.
```

**You check**

- Bright, on a laptop: create a class of 3, print codes, record consent for 2. Sign in on Phone A with a new code. The consent gate behaves as recorded.
- The Phones page lists both test phones with their pending counts.

**Done when**

- Classes, pupils, codes, consent and phones work from a laptop.

### S36. Flags, borderline review and safeguarding handling

**Goal:** every flag reaches Bright, is acted on, and leaves a record.

**Branch:** `feat/S36-admin-flags`

```text
Runbook session S36: flags and review. Apply the build standard. Read specs/prd.md section 9 items 1 to 3, FR-22, FR-25, FR-26, FR-30, section 10.

1. Safeguarding box pinned at the top: time, class, pupil display name (admin only), job, the pupil's exact text. "Mark as handled" requires a note of what was done and by whom. Unhandled count in the menu. Unhandled flags older than 24 hours show "Overdue".
2. Stalled flags, newest first: pupil, segment, tries, versions seen, last reasons. Actions "Content fix needed" or "Human help suggested" with a note. "Cleared by pupil" with date when the pupil completes it.
3. Borderline segment checks: question, answer, reason, AI output, tie-break decision. "Agree" or "Disagree" with a note. Disagreements feed the AI agreement measure and can be exported as new eval rows for content-work/eval/ai-check.csv.
4. Borderline theory marks: question, scheme points, answer, AI points with evidence. Approve, or change marks per point, then save. Saving recalculates the total and mastery on the server.
5. Filters: kind, class, segment, open or done.
6. Admin only.
```

**You check**

- Force a stalled, a borderline and a safeguarding flag on Phone A. All three appear on the laptop within a minute, safeguarding on top.
- Approve a borderline theory mark. On the phone, "Being checked by a teacher" disappears and the score updates.
- Export disagreements. The rows open as a valid eval CSV.

**Done when**

- Bright handles a safeguarding flag, clears a stalled flag and approves a mark from a laptop.

### S37. Progress, pilot measures and the teacher view

**Goal:** one honest picture of every pupil, the pilot measures from real data, and a read-only view for the class teacher.

**Branch:** `feat/S37-progress-teacher`

```text
Runbook session S37: progress, pilot measures, teacher view. Apply the build standard. Read specs/prd.md section 9 items 4 and 5, section 12 (success measures), section 5.

1. Progress table per class: pupil; onboarding; overview; each segment 1A to 1E as complete, moved on, in progress or not started with tries; latest and best exam score; mastery; re-check; last active; pending sync on the phone. Text labels, not colour alone.
2. Pilot measures, from the events and attempts tables through SQL views:
   - share of pupils who finished onboarding to exam
   - share of segments completed within 3 tries; stall counts per segment
   - share of wrong-reason retries that ended in sound reasoning after the second video
   - Paper A scores and re-check scores
   - AI agreement: borderline flags agreed unchanged
   - median minutes per segment, fallback rate, offline share of attempts
3. Misconception map: per segment, how often each misconception code appeared, and how often the targeted version fixed it on the next try. This is the content team's main tool after the pilot.
4. AI page: ai_usage_daily (calls, failures, median latency, pupils at cap, prompt versions in use). No pupil text.
5. CSV export of the progress table and measures (display names only, no answers).
6. Teacher view: a teacher sees only Progress for their own classes, read-only, no flags, AI page or exports of other classes. Typing /admin/flags shows "This page is for the admin."
7. Extend npm run test:rls: teacher A cannot read class B, flags, ai_calls, audit or events of other classes; cannot write anything; pupils get nothing from admin views.
8. docs/dashboard-guide.md for the class teacher: one page, calm second person.
```

**You check**

- Compare the progress table with what TEST-P1 to TEST-P3 did. Every cell is right.
- Sign in as the 7A teacher. Only 7A. Typing `/admin/flags` is refused.
- `npm run test:rls` all PASS, locally and in CI.

**Done when (B10 gate)**

- Live pilot measures and misconception map. Teacher isolation proven by tests and by hand.

## B11 Pilot readiness: S38 to S39 (6 to 7 Dec)

B11 is done when a full pilot day has been rehearsed on the real phones, every non-functional bar in the quality table is measured and met, and the 7 Dec quality gate has run on the full 100-answer sample. These sessions measure and fix. They do not add features.

### S38. Pilot rehearsal: offline, speed, memory, battery, data

**Goal:** prove the app survives a real school day on the cheapest phone.

**Branch:** `feat/S38-rehearsal`

```text
Runbook session S38: pilot rehearsal. Apply the build standard. Read specs/prd.md section 11 and the runbook quality table. Read docs/perf-baseline.md.

Write docs/rehearsal.md as a script I run, then fix what it finds:
1. Offline: fresh install on Phone B, "Prepare this phone" on Wi-Fi, then airplane mode for the whole topic, overview to exam submit. List every screen that needed the network for anything other than AI checks, exam marking or sync.
2. Speed on Phone A: cold start, Home, segment open, video start, check round trip on the router. Each under 4 seconds except the check (target: median under 6 seconds online).
3. Memory and stability: a 60-minute session on Phone A (all 5 parts plus the exam). Record peak memory. No out-of-memory crash, no stutter in the last video.
4. Battery: percentage used in that 60 minutes, screen on. Keep the screen awake during videos and the exam only (expo-keep-awake), if not already done.
5. Shared phone: 3 test pupils take turns on Phone B with the network off, then sync. Every row under the right pupil.
6. School network: 5 phones (or 2 phones repeated) syncing at once on the pilot router. No failed batches.
7. Data use per pupil end to end, written into docs/data-use.md with the topic download size.
8. Compare everything with docs/perf-baseline.md and the quality table. Anything over a bar gets a fix in this session, or a logged reason and owner in ops/BLOCKERS.md.
```

**You check**

- Run `docs/rehearsal.md` yourself, step by step, on the real phones. Fill in every number.

**Done when**

- Every bar in the quality table measured. Every miss fixed or logged with an owner.

### S39. Quality gate, bug bash, accessibility and copy sweep

**Goal:** the AI meets its agreement targets on the full sample, and every known bug that could hurt a pupil is fixed.

**Needs:** the full 100-answer sample in `content-work/eval/ai-check.csv` (60 adult-written, 40 from 5 consented volunteer pupils, hand-marked by the reviewer without seeing the AI).

**Branch:** `feat/S39-gate-bugbash`

```text
Runbook session S39: quality gate, bug bash, sweeps. Apply the build standard. Read specs/prd.md 8.4 and section 12, ops/BUGS.md.

1. Run npm run eval:check on the full sample with the final prompt version. Report the numbers against 85% answer and 80% reasoning. List every question whose items disagree more than once. For each, propose: prompt wording (Bright decides), reference reasoning (content team), or tapOnly. Apply only what Bright approves, then re-run the eval and report again.
2. Run npm run eval:theory on all hand-marked theory answers. Report.
3. Bug bash: work through ops/BUGS.md by severity (crash, wrong mark, blocks pupil first). For each fix, a failing test first where the cause is a rule or a server function.
4. Accessibility sweep with TalkBack on every pupil screen; font scale 1.3; reduced motion. Fix what fails.
5. Copy sweep: npm run copy:check, then read every pupil-facing string aloud with Bright for tone (calm, second person, short).
6. Full Maestro run of every flow on Phone A. All pass.
```

**You check**

- Write the final eval numbers in `ops/DECISIONS.md` with the prompt version, and Bright's decision for each failing question.
- Every crash, wrong-mark and blocks-pupil bug in `ops/BUGS.md` is closed or has Bright's written decision.

**Done when (B11 gate)**

- The quality gate has passed, or the failing items are tapOnly by Bright's decision.
- No open crash, wrong-mark or blocks-pupil bugs. All Maestro flows pass.

## B12 Handwriting and Release: S40 to S41 (7 to 14 Dec)

S40 runs only if S14 to S39 are all merged by 7 Dec. It is first on the cut list. If cut, write "S40 cut" in `ops/DECISIONS.md` and go to S41.

### S40. Photo of handwriting (optional)

**Goal:** a pupil photographs a written answer, confirms what the app read, and the photo is gone.

**Branch:** `feat/S40-handwriting`

```text
Runbook session S40: handwriting. Apply the build standard. Read specs/prd.md (answer input, 8.1 handwriting, section 10 photos), specs/framework.md (Response formats), specs/B12.md.

1. A third option for segment answers and reasons only (never the exam): "Take a photo of my writing". Camera only (expo-image-picker), resized to at most 1280 px on the long side and under 400 KB (expo-image-manipulator). Hidden when offline.
2. Job ai-read-handwriting in the gateway, claude-sonnet-5-5, input: the image and the question text only. Output: { text, confidence high or low, safeguarding }. Counts toward the daily cap.
3. Always: "I read: <text>. Is that right?" with an editable field, "Use this" and "Take another photo". Nothing is checked until the pupil confirms. Then the normal ai-check path with input mode photo.
4. Photos are never saved to the gallery or to Supabase Storage. The image goes to the function in the request body only. The temp file is deleted when the text is confirmed or the screen is left. Prove each point in the plan.
5. Maestro flow handwriting.yaml with a test image injected in the e2e build.
```

**You check**

- 10 real written answers, neat and messy, on Phone A. Each ends with the right text after confirmation. Write how many needed editing.
- Gallery and file manager: no photos.

**Done when (B12 gate)**

- 10 real answers read or corrected. No photo stored anywhere.

### S41. Release 0.9 (8 Dec) and 1.0 (14 Dec)

**Goal:** production is set up safely, final content is in, and the release build is on every pilot phone.

**Needs:** content freeze (5 Dec), quality gate decisions (7 Dec), signed consent forms, DPC registration submitted. **Bright runs every production step.**

**Branch:** `release/0.9`, then `release/1.0`

```text
Runbook session S41: release <0.9 or 1.0>. Read CLAUDE.md, specs/prd.md section 12, the Build Plan pilot checklist, docs/rehearsal.md.
Stop before every step that touches atlas-prod and wait for Bright to type "go prod".

Part A: checks on main
1. CI green on main: typecheck, lint, tests with coverage, content:check, copy:check, RLS suite, release bundle check on the production profile.
2. Full Maestro run on Phone A: all flows pass.
3. Every question Bright marked tapOnly is tapOnly in content/materials.json.
4. Prompt versions in use match the versions in ops/DECISIONS.md from the quality gate.

Part B: atlas-prod (Bright types "go prod" before each step)
5. Push all migrations. Show the command first.
6. Deploy every Edge Function. Bright sets secrets himself (ANTHROPIC_API_KEY, SAFEGUARDING_EMAIL, email service key); give the commands without values.
7. Enable the alert retry schedule (pg_cron) on atlas-prod, or confirm the fallback from S16.
8. npm run content:import -- --prod with the typed confirmation. Show the summary.
9. Run the RLS suite against atlas-prod with temporary test users, then delete them.
10. Send one test safeguarding alert from a temporary test pupil. Bright confirms the email, then the test pupil and flag are deleted.
11. Bright creates the real class and pupils in the dashboard and records consent from the signed forms. Never create real pupils from this chat.

Part C: build and install
12. Bump to <0.9.0 or 1.0.0>. Sentry release set to the same version.
13. eas build --platform android --profile production. Keep the previous APK link in docs/release-<version>.md as the rollback.
14. Over-the-air updates stay off for V1: every fix ships as a new APK. Write this in docs/release-<version>.md.
15. Write docs/release-<version>.md: version, date, content version, prompt versions, migrations, function versions, known issues, rollback link, and the phone checklist below.
16. Phone checklist, per numbered phone: install; open; sign-in screen shows; "Prepare this phone" on the router until "Topic ready"; play 5 seconds of the overview with sound; airplane mode check; Android app pinning turned on for ATLAS; battery 100%; label on the back.
```

**You check**

- Every pilot phone passes the checklist. Tick each by number on paper and in the shift log.
- On one phone, sign in with a real code, do onboarding, play the overview. Bright then resets that pupil in the dashboard.
- For 1.0 on 14 Dec: only fixes from the 12 to 14 Dec window (crashes, wrong marks, top 3 problems). Compare the git log with `ops/BUGS.md`.

**Done when (Release gate)**

- Release build on every pilot phone, prepared and pinned.
- Every item in `specs/prd.md` section 12 ticked, or with a named reason and owner in `ops/STATUS.md`.

## When things go wrong: recovery prompts

Use these when a session goes off track. Each one is safe to paste at any point.

### R1. Tests fail and Claude wants to change the test

```text
Stop. CLAUDE.md rule 10: never skip, delete or weaken a test to make it pass.
Show me the failing test, what it expects, and what the code does instead. Tell me whether the test or the code matches the spec, and quote the spec line. Do not change either until I answer.
```

### R2. Claude is going in circles (same error 3 times)

```text
Stop editing. Summarise in 5 lines: what you are trying to do, what you tried, the exact error each time, what you think the real cause is, and two different ways forward. Do not run anything until I pick one.
```

If neither way works, commit what is there to the branch, write it in `ops/BLOCKERS.md`, and move to the next thing Bright has approved.

### R3. The plan is too big for one session

```text
This plan is too big for one session. Split it into two parts that can each be merged on their own, with tests. Call them <S number>a and <S number>b. Show me both plans. Build only part a now.
```

Log the split in `ops/DECISIONS.md`.

### R4. Something about the spec is unclear or wrong

```text
Do not guess. Write the question in ops/BLOCKERS.md with: the spec file and line, what is unclear, the options you see, and which option you would pick and why. Then continue with any part of this session that does not depend on it.
```

### R5. A change touches production, real pupil data or secrets

```text
Stop. CLAUDE.md rule 15. Undo any command that pointed at atlas-prod or real pupil data. Show me git status and the last 10 commands you ran. Confirm the active Supabase project is atlas-dev.
```

Tell Bright the same day.

### R6. The session is out of time at the end of a shift

```text
We are stopping mid-session. Commit everything on this branch with the message "<S number>: WIP, not ready". Push the branch. Then do End shift. In HANDOVER, write the exact next step as a sentence the next person can paste.
```

### R7. Claude usage limit warning

```text
We are close to the usage limit. Finish only the current step. Commit and push. Write HANDOVER now, so nothing is lost if the conversation stops.
```

Then tell Bright (risk "Claude usage limits hit" in the Build Plan).

### R8. A bug report from QA

```text
Bug <ID> from ops/BUGS.md. Read it. Reproduce it on paper first: which screen, which steps, which file is most likely at fault. Write a failing test that shows the bug if the cause is in src/domain or a server function. Then plan the fix. Branch: fix/<ID>-<short-name>. Wait for my OK.
```

### R9. Lost or broken branch

```text
Show me git status, git branch -a, git log --oneline -15 and git stash list. Do not run reset, rebase, checkout of files, or force push. Tell me in plain words what state the repo is in and the safest way back. Wait for me.
```

### Commands you must never allow

| Command | Why |
| --- | --- |
| `git push --force` or `git push origin main` | Overwrites work or skips Bright's review |
| `git reset --hard` without Bright | Loses work |
| Anything with `atlas-prod` outside S41 | Real pupil data |
| `supabase db reset` on a linked remote project | Wipes the database |
| Deleting files in `specs/`, `supabase/migrations/` or `ops/` | Bright's files, or history |
| Any command that prints `.env` contents | Leaks secrets into the chat |
