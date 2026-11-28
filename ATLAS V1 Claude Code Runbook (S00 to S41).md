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

These seven prompts wrap every session. Paste them as written, replacing only the angle-bracket parts.

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

## B3 Onboarding and B4 Home: S14 to S15 (27 to 28 Nov)

B3 is done when onboarding takes under 3 minutes, resumes after the app closes, and saves every answer. B4 is done when both Home sections open the topic, and the prerequisite nudge is tested and skippable.

### S14. Onboarding

**Goal:** four playful screens that learn who the pupil is. Nothing is marked right or wrong.

**Branch:** `feat/S14-onboarding`

```text
Runbook session S14: onboarding. Read specs/framework.md stage 1, specs/prd.md FR-5 to FR-7, specs/B3.md and CLAUDE.md (Look, rule 6, rule 7).

Build app/onboarding/ as 4 screens with a quiet progress line (4 small dots, no numbers, no percentage):
1. "What should I call you?" One TextField, max 20 characters, letters, spaces and hyphens only. PillButton "Next". This display name stays on the phone and in the pupils table. It is never sent to the AI (rule 2).
2. "Which class are you in?" Pill choices Basic 7, Basic 8, Basic 9. Basic 7 preselected.
3. "What do you enjoy? Pick up to 4." Pill toggles: football, music, farming, stories, cooking, market, animals, phones and computers. Picking a 5th gently says "You can pick up to 4." Next works with 1 to 4 picked.
4. Three "would you rather" cards, one at a time. Store the question id, the choice and the time taken in milliseconds. Draft choices (keep them in src/components/common/copy.ts so Bright can replace them):
   a. "Would you rather fix a broken radio, or find out why it broke?"
   b. "Would you rather plant a new farm, or sell at the market?"
   c. "Would you rather learn a new song, or write a new story?"
5. End screen: "Thank you, <name>. Let's start." PillButton "Go to my lessons".

Rules:
- Save each answer to pupil_profiles as soon as it is given (not only at the end), with time taken per screen.
- Resume: if the app closes mid-way, reopening goes to the first unanswered screen with earlier answers kept.
- Offline: answers save to a local queue and send when the network returns (simple version; S39 hardens the queue).
- No score, no right or wrong, no timer shown.
- Put the resume logic (which screen is next) in src/domain/onboarding.ts with tests first.
```

**You check**

- Stopwatch a full onboarding on Phone A, reading every screen at a normal pace. Must be under 3 minutes.
- Close the app on screen 3. Reopen and sign in. You land on screen 3 with screens 1 and 2 kept.
- In the dashboard, `pupil_profiles` shows interests, choices and times.
- Do onboarding in airplane mode, then turn the network on. The answers arrive.

**Done when (B3 gate)**

- Under 3 minutes, resumable, all answers saved.

### S15. Home: Choose a topic and Recommended

**Goal:** Home with both sections, and the prerequisite nudge that never blocks.

**Branch:** `feat/S15-home`

```text
Runbook session S15: Home. Read specs/framework.md stage 2, specs/prd.md FR-8 and FR-9, specs/B4.md and CLAUDE.md.

Build app/home/index.tsx:
1. Greeting: "Hello, <name>." (name from the phone, never from a server call to the AI).
2. Section "Recommended for you": cards for (a) topics the teacher has set for the class (for V1: the Materials topic, read from a class_topics row or a field on the class, follow specs/data-model.md), (b) segments waiting to be re-taught (segment_progress status moved_on, or wrong in a missed re-check), (c) a due re-check (S33 fills this in; leave a typed slot).
3. Section "Choose a topic": subject list (Science only in V1, Mathematics shown as "Coming soon", not tappable), then the topic list for that subject.
4. Each topic card shows the title, "5 parts" and a quiet progress line (segments complete out of 5). No percentages, no stars.
5. Prerequisite nudge: src/domain/prerequisites.ts with a function that takes the pupil's completed topics and a topic's prerequisites and returns { ok } or { missing: [...] }. Write tests first with FAKE prerequisite data (V1 has one topic with no prerequisites). When missing is not empty, show a sheet: "I'd suggest this first, here's why." with the reason, a PillButton to the missing topic, and a secondary button "Take me to the class topic anyway". The second button always opens the topic. Never block.
6. Add a dev-only switch on the dev screen that gives the Materials topic a fake prerequisite, so the nudge can be seen on a phone.
7. Tapping the topic from either section opens app/topic/[id].tsx (still a placeholder until S17).
8. Home loads from the local content cache first and refreshes in the background. Offline, it still shows.
```

**You check**

- Open the topic from "Recommended for you" and from "Choose a topic". Both reach the topic screen.
- Turn on the dev prerequisite switch. Open the topic. The nudge shows. Tap "Take me to the class topic anyway". The topic opens.
- Airplane mode, close and reopen the app. Home still shows.

**Done when (B4 gate)**

- Both sections open the topic.
- Prerequisite nudge tested in Jest and on Phone A, and skippable.

## B5 Overview: S16 to S17 (28 to 29 Nov)

B5 is done when the overview works offline after download, and the profile updates when the network returns.

For these sessions you need at least one real test MP4, its poster JPEG and its `.vtt` file on R2. If the video producer has not delivered yet, Bright makes a 30-second test clip on a paper-coloured background and uploads it as `mat-OV-a-360.mp4`.

### S16. Topic download and the board video player

**Goal:** a topic's videos download once to the phone, and play in the seamless board style.

**Branch:** `feat/S16-video-board`

```text
Runbook session S16: topic download and board video player. Read specs/video-board.md fully (every rule P1 to P10 and the Done when list), specs/prd.md section 11 (Offline, Data use), specs/B5.md and CLAUDE.md (Lesson video player).

Build:
1. src/data/videoCache.ts with expo-file-system:
   - pick 360p or 480p (360p by default; 480p only if the pupil chooses "Better quality" in a later setting, not in V1 UI)
   - download every video, poster and .vtt file for a topic into the app's document folder, one at a time, resumable after a lost connection, checking file size after download
   - a manifest of what is downloaded, keyed by content version, so a content change re-downloads only changed files
   - functions: getTopicDownloadSize, downloadTopic (with progress), isTopicReady, localUriFor(version)
2. "Download this topic" screen in app/topic/[id].tsx before the overview, when the topic is not ready: "This topic needs <size> MB of data. Download it now, on Wi-Fi if you can." Progress shown as "<n> of <total> videos". Cancel and resume work.
3. src/components/board/BoardVideo.tsx using expo-video (or expo-av if expo-video cannot meet the rules; explain in the plan). It must meet every rule in specs/video-board.md:
   P1 no chrome, no controls, no long-press menu, no picture-in-picture, no casting
   P2 the area background equals boardColour from the content file, plus a 4% soft fade at each edge
   P3 plays only the local file; shows the poster until the first frame is ready
   P4 autoplay with sound; if refused, play muted with a "Tap for sound" pill, unmute on first touch without restarting
   P5 tap to pause or continue; paused dims slightly and shows "tap to continue" in Caveat 700
   P6 pauses when less than half the board is on screen, and when the app goes to the background; resumes only if the pupil did not pause
   P7 captions under the board from the .vtt file, driven by the video's current time, not a separate timer
   P8 end state: last frame stays, onEnded callback fires so the parent screen can fade in the next section and scroll to it
   P9 a "Watch again" control the parent can render; restarts the same version and scrolls back to the board
   P10 header above the board: breadcrumb "Basic 7 Science · Materials", title, journey label
4. A small .vtt parser in src/domain/vtt.ts with tests first (timestamps, multi-line cues, empty lines).
5. Dev screen entry: "Board video test" that plays the overview test file.
No red, no exclamation marks, no player controls of any kind.
```

**You check** (use the `specs/video-board.md` Done when list)

- On both phones, look closely at the edge of the board. No visible line between video and screen.
- Long-press the video. No menu appears.
- Press the home button during playback. Reopen. It is paused. Scroll the board half off screen. It pauses.
- Captions match the voice to within half a second. Check 3 lines against a stopwatch.
- Download the topic, then airplane mode, then play. Poster, captions and end state all work.

**Done when**

- Every line of the `specs/video-board.md` Done when list proven on both phones.
- `vtt` parser tests pass.

### S17. Overview stage and the ai-overview job

**Goal:** after the overview video, the pupil says what they took from it. The AI listens and updates the profile. It is never a grade.

**Branch:** `feat/S17-overview`

```text
Runbook session S17: overview stage and ai-overview. Read specs/framework.md stage 3, specs/prd.md FR-10 to FR-13 and section 8, specs/ai-prompts.md (overview listening prompt), specs/B5.md and CLAUDE.md rules 1, 2, 3, 5, 9, 11, 13.

Build:
1. supabase/functions/ai-overview:
   - input: { pupil_id, topic_id, summary_text, confusing_text }. Validate with zod. Both texts max 600 characters; either may be empty (skipped).
   - check the caller is that pupil (auth.uid matches)
   - call the Claude API with model claude-haiku-5-5, the system prompt from specs/ai-prompts.md, the segment titles and codes, and the two texts. No name, no class, nothing else about the pupil
   - expected output, parsed with zod: { keywords: string[], interests: string[], confusions: string[], segmentsMentioned: string[] (codes OV, 1A to 1E only), safeguarding: boolean }
   - write keywords, interests and confusions into pupil_profiles
   - log the call in ai_calls (job ai-overview, model, pupil_id, input, output, ok, latency)
   - the API key is read from Supabase secrets as ANTHROPIC_API_KEY. Tell me the command to set it; I will run it myself with the value
   - 20-second limit; on timeout or bad output after one retry, return { fallback: true } (S25 adds full hardening; build the basic version now)
2. Overview screen in app/topic/[id].tsx: BoardVideo for the overview. On end, fade in below the board:
   - "Tell a friend what this video was about, in one or two sentences." TextField, multi-line
   - "Which part felt confusing?" TextField, multi-line
   - PillButton "Send" and a quiet "Skip" text button
   - "Watch again" (P9)
3. After Send or Skip: "Thanks. That helps me choose how to teach this." then go to the first segment (placeholder until S21). Never show anything that looks like a mark.
4. Offline or failed call: save the texts in the local queue, show the same thanks message, continue. Send when the network returns.
5. Save overview_responses rows in all cases.
6. If safeguarding is true: do not show anything different to the pupil here beyond the thanks message, but create a safeguarding flag (S27 adds the alert email).
```

**You check**

- Watch the overview on Phone A, type two sentences, send. In the dashboard, `pupil_profiles` gains keywords, and `ai_calls` has one row with no pupil name in the input.
- Repeat in airplane mode. The thanks message shows. Turn the network on, reopen the app. The profile updates within a minute.
- Tap "Skip". You move on. No error.

**Done when (B5 gate)**

- Overview works offline after download.
- Profile updates when the network returns.
- `ai_calls` logs every call, with no names.

## B6 Segment loop: S18 to S24 (29 Nov to 1 Dec)

B6 is done when the routing and tries tests pass, and every path has been forced on a phone. This is the heart of ATLAS. Do not rush it. The Sprint 1 demo on 1 Dec is the whole learner flow on a test phone.

The loop, in one picture of rules (from `specs/prd.md` FR-14 to FR-26):

| Result of a try | What happens |
| --- | --- |
| Answer correct and reasoning sound | Segment complete. "Well reasoned." |
| Anything else (wrong answer, or right answer with a wrong reason) | One try used. Before try 2 and try 3, `routing.ts` picks the next unseen version. No unseen version: worked-example card |
| Right answer, wrong reason | Also logged as lucky guess or hidden misconception |
| Either verdict "unsure" | Tie-break with the read-back and the tap reason options. A borderline flag goes to the admin |
| Third failed try | "We'll come back to this one. You're not behind." Stalled flag. Segment goes to Recommended. Move on |

### S18. Routing and tries rules (pure logic, tests first)

**Goal:** the rules that decide the next video and count tries, fully tested, with no screens.

**Branch:** `feat/S18-routing`

```text
Runbook session S18: routing and tries rules. Read specs/prd.md 6.5, 6.6 and 8.2, specs/framework.md stages 4 and 5, specs/B6.md and CLAUDE.md rules 4 and 10.
This session writes only pure TypeScript in src/domain with Jest tests. No React, no Supabase, no screens. Write all tests first, show them to me, wait for my OK, then write the code.

1. src/domain/routing.ts
   chooseFirstVersion(versions, pupilInterests): the version whose interestTags overlap the pupil's interests most. Tie: version a.
   chooseNextVersion(versions, seenLabels, misconceptionCodes, pupilInterests): from unseen versions, the one whose misconceptionTags match the most codes. Tie: most interest overlap. Still tied: alphabetical label. No unseen version: return { kind: "workedExample" }. Otherwise { kind: "version", label }.
   Codes are collected from both the answer and the reason, without duplicates.
2. src/domain/tries.ts
   A reducer over a segment's state: { status, triesUsed, versionsSeen, lastCodes }. Events: started, attemptJudged { answerCorrect, reasoningSound, codes }, movedOn, returnedLater.
   Rules: max 3 tries. answerCorrect yes and reasoningSound yes ends with status complete. Anything else uses one try. After the 3rd failed try, status moved_on and a stalled flag is required (return it as an effect). A right answer with a wrong reason returns an effect logLuckyGuess.
   Verdicts arrive already resolved to yes or no (the unsure tie-break happens in S22 before this reducer).
   returnedLater on a moved_on segment starts a fresh 3 tries and keeps versionsSeen; the stalled flag clears only on complete (effect clearStalledFlag).
3. Tests must cover at least: first version by interests and tie; next version by codes, by interests on tie, by label on double tie; no unseen version; codes from answer plus reason with duplicates; complete on try 1, 2 and 3; three failures; lucky guess; returning later then completing clears the flag; returning later and failing again keeps the flag; impossible events are rejected.
4. 100% line coverage for both files. Show me the coverage report.
```

**You check**

- Read the list of test names Claude shows before writing code. Every row of the table above has a test. If one is missing, say which.
- `npm test -- --coverage`. Both files at 100%.

**Done when**

- All routing and tries tests pass with 100% coverage.

### S19. The ai-check job

**Goal:** the server function that judges the answer and the reason, returning a fixed shape.

**Branch:** `feat/S19-ai-check`

```text
Runbook session S19: ai-check Edge Function. Read specs/prd.md FR-17 and section 8, specs/ai-prompts.md (answer and reason check prompt), specs/framework.md (The AI check, The reasoning check), CLAUDE.md rules 1, 2, 3, 9, 11, 13, 14.

Build supabase/functions/ai-check:
1. Input (zod): { pupil_id, segment_code, try_number, question_id, answer_text, answer_mode typing or tap, reason_text, reason_mode typing or tap }. Max 600 characters each.
2. Check that auth.uid is that pupil and that consent is recorded. If not, refuse.
3. Load from the database, not from the client: the question, accepted answers, reference meaning, reference reasoning, and the segment's misconception list with codes.
4. Call claude-sonnet-5-5 with the system prompt from specs/ai-prompts.md. Send only the question, the references, the misconception list and the pupil's two texts. Never the name or class.
5. Output shape, parsed with zod (put the schema in src/domain/aiSchemas.ts so the app shares it):
   { answerCorrect: "yes"|"no"|"unsure", reasoningSound: "yes"|"no"|"unsure", misconceptionCodes: string[] (only codes from this segment), readBack: string (one sentence, max 200 characters, second person, starting with "You think" or "You said"), safeguarding: boolean }
   Unknown codes are dropped and logged, not passed on.
6. Tap answers and tap reasons are judged without AI where possible: a tap answer is correct if it equals an accepted answer; a tap reason maps directly to sound or its misconception code. If both are taps, make no AI call at all and build the read-back from the chosen texts.
7. Log every call in ai_calls. Basic timeout 20 seconds and one retry on bad output; return { fallback: true } otherwise. (S25 finishes hardening.)
8. scripts/tryCheck.ts: runs 6 fixed sample answers for segment 1B against atlas-dev and prints the verdicts. Samples: correct with sound reason; correct with wrong reason (heavy means strong); wrong with sound-sounding reason; nonsense text; an empty reason; a text in another language.
```

**You check**

- Run `scripts/tryCheck.ts`. Read each verdict. Does it match what a teacher would say? Write any disagreement in the shift log for Bright and the content reviewer.
- In `ai_calls`, the input has no names.

**Done when**

- The output always matches the zod shape.
- Tap-only attempts make no AI call.

### S20. Segment progress and attempt saving

**Goal:** every try is saved with all its fields, and the segment state lives in one place.

**Branch:** `feat/S20-attempts-data`

```text
Runbook session S20: segment progress and attempts. Read specs/prd.md FR-23, specs/data-model.md (segment_progress, attempts, flags) and specs/B6.md.

Build:
1. src/data/segmentRepo.ts: load and save segment_progress, insert attempts, create flags through a server function (pupils cannot insert flags directly; add supabase/functions/raise-flag that checks the pupil and the kind).
2. A hook useSegment(segmentCode) that runs the tries reducer from S18, saves every state change, and applies its effects (flags, lucky guess logging, Recommended).
3. Each attempt row records every FR-23 field: try number, version shown, answer, input mode, reason, reason mode, sure or not sure, time taken in ms (from question shown to submit), changed answer (true if the pupil edited their answer after first typing it, or changed tap), AI verdicts, misconception codes, fallback used, read-back confirmed or edited.
4. All writes go through the offline queue (local first, sent when online). Use a client-generated id per attempt so a resend never creates a duplicate.
5. Tests for the mapping from reducer effects to repository calls, with a fake repository.
```

**You check**

- Ask Claude to run a scripted attempt for TEST-P1 on 1A. In the dashboard, one attempt row with every field filled.
- Run it twice with the same id. Still one row.

**Done when**

- Every FR-23 field saved.
- No duplicate attempts on resend.

### S21. Segment screen: video and "Your turn"

**Goal:** the pupil watches the chosen version, then answers the check question by typing or tapping.

**Branch:** `feat/S21-segment-screen`

```text
Runbook session S21: segment screen part 1. Read specs/video-board.md section 4, specs/framework.md stage 4, specs/prd.md FR-14 and FR-15, specs/B6.md. The video player follows specs/video-board.md.

Build app/segment/[id].tsx, top to bottom on one scrolling screen:
1. Header (P10): breadcrumb, segment title, journey label like "Part 2 of 5".
2. BoardVideo playing the version chosen by routing.ts (first version from interests).
3. When the video ends: fade in a section headed "Your turn" in Caveat 700, then the check question for this try number. Scroll it into view.
4. Answer input: a multi-line TextField first, with the hint "Type your answer". Under it a text button "Choose an answer instead" that shows the 3 tap options as pill buttons. The pupil can switch back to typing.
5. Track: time from question shown, and whether the answer was changed.
6. "Watch again" restarts the same version (P9) and does not use a try.
7. PillButton "Next" is enabled once an answer exists. It leads to the S22 steps (placeholder for now).
8. The question for try 2 is the try-2 question, for try 3 the try-3 question. Never repeat a question within the same 3 tries.
No right or wrong is shown on this screen. No red.
```

**You check**

- On Phone A, open 1A. Video plays, ends, "Your turn" fades in and scrolls into view.
- Switch to tap options and back to typing. Both work.
- "Watch again" restarts the same video.

**Done when**

- Video to question flow works on both phones.

### S22. Sure or not sure, "Why do you think so?" and the read-back

**Goal:** after every answer, the confidence tap, the reason, the AI check and the read-back the pupil can correct once.

**Branch:** `feat/S22-why-readback`

```text
Runbook session S22: confidence, reason, check and read-back. Read specs/prd.md FR-15 to FR-18 and FR-22, specs/framework.md (The reasoning check), specs/B6.md and CLAUDE.md rules 3, 5, 7.

Build, continuing the segment screen:
1. After "Next": "How sure are you?" two pills "Sure" and "Not sure". Required.
2. Then "Why do you think so?" Every time, right or wrong. TextField first; "Choose a reason instead" shows the 3 reason options. PillButton "Check my thinking".
3. Call ai-check. While waiting: LoadingCalm "Reading your answer". After 20 seconds or on { fallback: true }: "I could not check that just now. Pick the one closest to what you meant." then show the tap answer options (if the answer was typed) and the tap reason options; judge those taps locally; queue the typed text for later review.
4. Read-back: "Here's what I understood: <readBack> Is that right?" Two pills "Yes" and "Not quite". "Not quite" lets the pupil edit their reason once and re-check. After one edit, accept the second result.
5. Unsure tie-break (put the rule in src/domain/tieBreak.ts with tests first): if answerCorrect or reasoningSound is "unsure", ask "Which of these is closest to what you meant?" with the tap reason options (and tap answer options if the answer verdict is unsure). The tapped options decide yes or no. Then raise a borderline flag with the AI output attached.
6. Safeguarding true: show "Thank you for sharing. A teacher may check in with you." Show no verdict for this answer, do not use a try, raise a safeguarding flag, and let the pupil continue the segment.
7. Pass the final yes or no verdicts and codes to the tries reducer. Save the attempt.
```

**You check**

- Type a correct answer with a wrong reason (for 1B: "Iron is strong because it is heavy"). The read-back states your idea. A try is used.
- Tap "Not quite", edit the reason, re-check. Only one edit allowed.
- Airplane mode, then check. The tap fallback appears within 20 seconds and you can continue.

**Done when**

- `tieBreak` tests pass.
- Fallback never traps the pupil.

### S23. Outcomes: complete, retry, worked example, move on

**Goal:** what the pupil sees after each judged try, including the 3-try ceiling.

**Branch:** `feat/S23-outcomes`

```text
Runbook session S23: segment outcomes. Read specs/prd.md FR-19 to FR-26, specs/framework.md stage 5, specs/B6.md and CLAUDE.md rules 6 and 7. The video player follows specs/video-board.md.

Build:
1. Complete: a calm card "Well reasoned." plus one sentence from the reference reasoning, and PillButton "Next part". Next part opens the next segment, or the exam unlock screen after 1E.
2. Try used (try 1 or 2 failed): "Let's look at it another way." Then the next version chosen by chooseNextVersion plays on the same screen (scroll back to the board), followed by the next try's question.
3. No unseen version left: show the worked-example card (text plus photo, in a Card, under 120 words) instead of a video, then the next try's question.
4. Third failed try: "We'll come back to this one. You're not behind." and PillButton "Next part". The reducer effects raise the stalled flag and put the segment in Recommended.
5. A segment opened again from Recommended starts a fresh 3 tries with versions already seen excluded where possible, and shows on Home as "Waiting for you".
6. Topic screen shows each part's status quietly: done, in progress, waiting for you. No ticks in red or green.
Copy only as written above or in the specs.
```

**You check**

- Fail 1A three times on purpose on Phone A. You see the second version, then the worked-example card, then the kind message. Home shows 1A under Recommended. A stalled flag row exists.
- Open 1A from Recommended and answer well. The segment completes and the flag shows cleared.

**Done when**

- All five outcomes seen on a phone.

### S24. Path checklist and Sprint 1 demo

**Goal:** every path of the loop is forced and ticked on a phone, and the whole learner flow runs end to end.

**Branch:** `feat/S24-path-checklist`

```text
Runbook session S24: path checklist. Read specs/B6.md, specs/prd.md 6.5 and 6.6, docs/path-checklist.md.

Build:
1. A dev-only "Force verdict" panel (only when __DEV__ is true, never in preview or production builds) on the segment screen: buttons that make the next check return a chosen verdict: correct+sound, correct+wrong reason, wrong+sound, wrong+wrong, unsure answer, unsure reasoning, fallback, timeout, safeguarding. It must not call the AI when forcing.
2. A build-time check that the panel code is stripped from preview builds. Prove it by searching the preview bundle.
3. docs/path-checklist.md: one row per path with columns Path, How to force, Expected result, Phone A result, Phone B result, Date, Tester. Paths: every row of the outcome table in this runbook, every force button, Watch again, typing to tap switch, read-back edit, return from Recommended, app killed mid-question (resumes at the same try), airplane mode at each step.
4. Fix anything the checklist finds before the PR.
```

**You check**

- Fill in every row of `docs/path-checklist.md` on both phones yourself.
- Sprint 1 demo: sign in, onboarding, overview, all 5 segments with at least one retry, reach the exam unlock screen. Record the time and any confusion in the shift log for Bright.

**Done when (B6 gate)**

- Routing and tries tests pass.
- Every path in the checklist is ticked on both phones.
- Force panel is absent from the preview build.

## B7 AI hardening: S25 to S27 (2 to 3 Dec)

B7 is done when bad JSON, timeout, the daily cap and safeguarding are all tested, and network loss never traps a pupil.

### S25. One safe AI wrapper for every job

**Goal:** all AI jobs share one tested wrapper: strict parsing, one retry, a 20-second limit, a clean fallback.

**Branch:** `feat/S25-ai-wrapper`

```text
Runbook session S25: shared AI wrapper. Read CLAUDE.md rules 1, 3, 5, 9, 13, specs/prd.md 8.3 and specs/B7.md.

Build:
1. supabase/functions/_shared/callClaude.ts used by ai-overview, ai-check and (later) ai-mark-theory and ai-read-handwriting:
   - inputs: job name, model, system prompt, user content, zod schema, pupil_id
   - asks for JSON only; extracts the JSON object even if wrapped in text or code fences; parses with the zod schema
   - bad output: retry once with a short reminder of the shape; second failure returns { fallback: true, reason: "bad_output" }
   - 20-second limit across both tries; timeout returns { fallback: true, reason: "timeout" }
   - API error 429 or 5xx: no retry storm; return { fallback: true, reason: "api_error" }
   - logs every attempt in ai_calls with ok true or false and latency
   - never logs the API key, never includes a name
2. Refactor ai-overview and ai-check to use it. Behaviour must not change for valid outputs.
3. Tests (Deno test or Jest with a fake fetch) for: valid JSON; JSON inside text; JSON in code fences; wrong shape then fixed on retry; wrong shape twice; missing fields; extra fields stripped; invalid misconception code dropped; timeout; 429; 500; empty response.
4. App side, src/data/aiClient.ts: every AI call from the app has its own 22-second client timeout and treats any network error as fallback, never as a crash.
```

**You check**

- Run the wrapper tests. All 12 cases pass.
- On Phone A, use the force panel "fallback" and "timeout". Tap options appear each time.

**Done when**

- All AI jobs use the wrapper.
- All 12 failure cases tested.

### S26. Daily cap, spend guard and AI log checks

**Goal:** no pupil can make more than 120 AI calls a day, and every call is logged.

**Branch:** `feat/S26-ai-cap`

```text
Runbook session S26: daily AI cap. Read CLAUDE.md rules 9 and 13, specs/prd.md 8.3 and specs/B7.md.

Build:
1. In callClaude.ts, before any API call: count today's ai_calls for this pupil (Africa/Accra day, which is UTC). At 120 or more, do not call the API; return { fallback: true, reason: "daily_cap" } and log a row with ok false and job "cap_reached".
2. Make the count safe when two calls arrive at once (a database function or a lock). Explain your choice in the plan.
3. The app treats daily_cap like any fallback: tap options, no scary message. Copy: "Let's use the choices for now."
4. A SQL view for the admin: ai_usage_daily (date, job, calls, failures, average latency, pupils at cap). No pupil text in the view.
5. Test script scripts/capTest.ts against atlas-dev: sets TEST-P2's count to 119 with fake log rows, makes 2 calls, shows the second is refused. Then deletes the fake rows.
6. Add to docs/install.md a note for Bright: set the monthly spend limit in the Anthropic Console and check it weekly.
```

**You check**

- Run `scripts/capTest.ts`. Call 120 is allowed, call 121 is refused.
- On Phone B, signed in as TEST-P2 at the cap, a check gives tap options calmly.

**Done when**

- Cap enforced on the server and proven by the script.

### S27. Safeguarding alerts, offline queue for checks, and the quality gate runner

**Goal:** safeguarding works end to end with an email to the admin, typed answers made offline are checked later, and the 7 Dec quality gate can be run with one command.

**Branch:** `feat/S27-safeguarding-gate`

```text
Runbook session S27: safeguarding, offline checks and quality gate runner. Read CLAUDE.md rules 2, 5, 14, specs/prd.md section 10 and 8.4, specs/ai-prompts.md and specs/B7.md.

Build:
1. Safeguarding:
   - every AI job's output includes safeguarding true or false (already in the schemas)
   - when true: create a safeguarding flag with the job, the pupil_id and the exact text; the pupil sees only "Thank you for sharing. A teacher may check in with you."; no verdict shown for that answer
   - supabase/functions/alert-admin sends an email the same minute to the address in Supabase secret SAFEGUARDING_EMAIL (Bright sets it). Use a transactional email service available from Edge Functions (for example Resend); tell me what account Bright needs. The email says "A safeguarding flag needs review in the ATLAS dashboard" plus the time and class. No pupil text and no name in the email.
   - if the email fails, retry 3 times over 10 minutes and log each failure
2. Offline checks: a typed answer made while offline, or that hit fallback, is queued with its attempt id. When the network returns, it is sent to ai-check in the background for the record and for safeguarding. The result never changes what the pupil already saw, except that a safeguarding result still raises the flag and the email.
3. Quality gate runner scripts/qualityGate.ts (npm run gate):
   - reads content-work/pilot/gate-sample.csv with columns id, segment, try, answer, reason, reviewer_answer (yes or no), reviewer_reasoning (yes or no)
   - runs each row through ai-check on atlas-dev with a gate test pupil id
   - writes content-work/pilot/gate-results-<date>.csv and prints: answer agreement %, reasoning agreement %, unsure count, and the item ids that disagree, grouped by question
   - pass mark printed: answer at least 85%, reasoning at least 80% (specs/prd.md 8.4)
   - gate-sample.csv and results are git-ignored, because they may contain pupil words
4. A way to make a question tap-only: a tapOnly flag per check question in the content schema and the database; when true the app hides typing for that question and makes no AI call. Add schema tests.
```

**You check**

- Force "safeguarding" on Phone A. The calm message shows, no verdict. Bright receives the email within 2 minutes. The email has no name and no pupil text.
- Answer a question in airplane mode by typing. Turn the network on. A new `ai_calls` row appears for it.
- Run `npm run gate` with a 5-row test CSV. The percentages print.

**Done when (B7 gate)**

- Bad JSON, timeout, cap and safeguarding all tested.
- Network loss never traps a pupil (re-run the airplane mode rows of `docs/path-checklist.md`).
- `npm run gate` works and tap-only works.

## B8 Exam: S28 to S31 (3 to 5 Dec)

B8 is done when the exam auto-submits at zero even after an app restart, and the results match a hand-marked copy. Exam length is Bright's decision (draft: 10 objective, 3 theory). Until he settles it, use `durationMinutes` from the content file.

### S28. Exam timer and scoring rules (pure logic, tests first)

**Goal:** a timer that cannot be reset by closing the app, and scoring that matches the scheme.

**Branch:** `feat/S28-exam-rules`

```text
Runbook session S28: exam timer and scoring rules. Read specs/prd.md FR-27 to FR-30, specs/framework.md stage 6, specs/B8.md and CLAUDE.md rule 10.
Pure TypeScript in src/domain with Jest tests. Write all tests first, show them, wait for my OK, then write the code.

1. src/domain/examTimer.ts
   remaining(startedAtServer, durationSeconds, nowServer): seconds left, never below 0.
   Time comes from a server timestamp saved when "Start exam" is tapped, plus a server-offset estimate so a wrong phone clock does not change the time. shouldAutoSubmit(remaining) is true at 0.
   Tests: normal countdown; app closed for 5 minutes then reopened; phone clock set 1 hour wrong; reopened after time is over (submit at once); duration 0 rejected.
2. src/domain/scoring.ts
   scoreObjective(items, answers): 1 mark per correct option unless the item says otherwise; unanswered is 0.
   totalScore(objectiveMarks, theoryMarks, maxMarks): total and percentage rounded down to a whole number.
   theoryItemMarks(schemePointResults, itemMax): sum of awarded scheme points, never above itemMax.
   Tests for each, including all unanswered, all correct, partial theory, and a theory result above the max.
3. src/domain/examUnlock.ts: unlocked when every segment of the topic is complete or moved_on. Tests first.
```

**You check**

- Read the test names. The phone clock case and the reopen-after-time case are both there.
- All tests pass.

**Done when**

- Timer, scoring and unlock tests pass.

### S29. Exam screens: rules, objective, theory, timer, auto-submit

**Goal:** a calm, real exam with the app as invigilator.

**Branch:** `feat/S29-exam-screens`

```text
Runbook session S29: exam screens. Read specs/prd.md FR-27 to FR-29, specs/framework.md stage 6, specs/B8.md and CLAUDE.md (rule 6: time pressure is allowed only in the exam).

Build app/exam/[id].tsx:
1. Unlock screen (after the last segment): "You have worked through every part. When you are ready, you can take the topic exam." Rules card: number of questions per section, the time, "You can move between questions in a section", "You will see your results after you finish", "When time is up, a sound plays and your paper is handed in". PillButton "Start exam".
2. Start: create exam_sittings with Paper A on first sitting, Paper B on a retake. Save the server start time. Fetch items without answers (the S06 safe function).
3. Objective section: one question per screen, 4 option pills, "Previous" and "Next", a small row of question dots to jump. Then "Go to the theory section" with a reminder that they cannot return to objective questions afterwards.
4. Theory section: one question per screen, multi-line TextField, marks shown, same navigation.
5. Timer: always visible at the top in IBM Plex Mono, calm ink colour, no flashing, no colour change, no ticking sound. Uses examTimer.ts.
6. Every answer is saved to the phone at once and queued to the server.
7. At zero: play a short stop-work sound (bundled audio file, under 2 seconds, our own or royalty-free with licence noted in docs/), show "Time is up. Your paper has been handed in." and submit. If the app was closed and reopened after time ran out, submit at once on reopening.
8. Manual submit: "Hand in my paper" with a confirm sheet showing unanswered count.
9. No feedback of any kind until submission. The back button during the exam asks "Leave the exam? Your time keeps running."
10. Submission works offline: the paper is saved and handed in when the network returns, and the pupil sees "Your paper is saved. Results will show when you are back online."
```

**You check**

- Start an exam on Phone A with a 3-minute test duration. Answer some, then kill the app. Wait 4 minutes. Reopen. The paper submits at once.
- Change the phone clock by 1 hour during an exam. The time left does not jump.
- Let the timer reach zero with the app open. The sound plays and the paper submits.

**Done when**

- Auto-submit at zero after an app restart, proven on Phone A.

### S30. Theory marking and borderline review

**Goal:** theory answers are marked against scheme points by the AI, and borderline marks wait for the admin.

**Branch:** `feat/S30-ai-mark-theory`

```text
Runbook session S30: ai-mark-theory. Read specs/prd.md FR-30 and section 8, specs/framework.md (AI marking of theory answers), specs/ai-prompts.md (theory marking prompt), specs/B8.md and CLAUDE.md rules 2, 3, 9, 13, 14.

Build:
1. supabase/functions/submit-exam: called on submission. Marks objective items on the server with scoring.ts logic (the client score is never trusted), stores marks, then calls ai-mark-theory for each theory answer, then writes the total.
2. supabase/functions/ai-mark-theory using callClaude.ts and claude-sonnet-5-5:
   - input: the question, the scheme points with marks, the pupil's answer. No name.
   - output (zod): { points: [{ pointIndex, awarded: 0 or the point's marks, evidence: short quote from the answer or "" }], borderline: boolean, credited: string, missing: string, safeguarding: boolean }
   - borderline is true when the model is not confident about any point, and also whenever the answer is under 5 words but not empty, or any point's evidence is empty but the point was awarded
   - fallback or bad output: mark the answer borderline with 0 provisional marks
3. Borderline answers: the exam total is shown as provisional, and those answers show "Being checked by a teacher" until an admin approves (S35 builds the admin side; for now scripts/approveMark.ts --answer <id> --marks <n>).
4. When every borderline answer in a sitting is approved, recompute the total.
5. Same answer, same mark: run each theory answer once and store it. Never re-mark automatically.
6. Test script scripts/markSample.ts: 6 fixed theory answers for one question (full marks, partial, wrong, empty, very short, off topic) and prints the marks.
```

**You check**

- Run `scripts/markSample.ts`. Compare each mark with what Bright or the content reviewer would give. Write the comparison in the shift log.
- Submit an exam with one very short theory answer. It shows "Being checked by a teacher".

**Done when**

- Theory marks stored per scheme point.
- Borderline answers wait for approval.

### S31. Results, revision and retake with Paper B

**Goal:** a results screen that teaches, and a fair retake.

**Branch:** `feat/S31-results`

```text
Runbook session S31: results and retakes. Read specs/prd.md FR-31 and FR-32, specs/framework.md stage 7, specs/B8.md and CLAUDE.md rules 6 and 7.

Build app/results/[id].tsx:
1. Top: "You scored <marks> out of <max>." If any mark is provisional: "Some answers are being checked by a teacher. Your score may go up."
2. Then every question where marks were lost, one Card each: the question, the pupil's answer, "What you got credit for", "What was missing", "A good answer", and a link "Watch part <code> again" that opens the segment video. Wrong options are shown in inkSoft, never red. Correct options in teal.
3. Two buttons: "Revise weak parts" (marks those segments as Recommended) and "Retake now" (starts Paper B). A third sitting reuses Paper A in a new order with a flag "repeat paper" in the results (cut list item 5 applies if Paper B content is not ready).
4. Compare attempts: if a retake without revision did not improve, show once: "It might help to look at <parts> again before your next try."
5. Results feed the profile: segments with lost marks go to Recommended.
6. docs/test-script.md: add "Exam hand-mark check": print a completed paper, have the content reviewer mark it by hand, and compare with the app's results line by line.
```

**You check**

- Finish a full exam as TEST-P1. Print the answers. Mark them by hand with the scheme. Compare with the app. Every objective mark must match. Theory marks must match or be borderline.
- Tap "Retake now". The questions are from Paper B.

**Done when (B8 gate)**

- Auto-submit at zero after restart proven.
- Results match a hand-marked copy.
- Retake uses Paper B.

## B9 Mastery: S32 to S33 (5 to 6 Dec)

B9 is done when the pass, fail and re-check paths are all tested. The 80% threshold is a draft. Keep it in one constant so Bright can change it without a code change elsewhere.

### S32. Mastery rule and celebration

**Goal:** the app decides mastery by the rule, shows a calm celebration, and sets the re-check for 3 days later.

**Branch:** `feat/S32-mastery`

```text
Runbook session S32: mastery. Read specs/prd.md FR-33 and FR-34, specs/framework.md stage 8, specs/B9.md and CLAUDE.md rules 6, 7, 10.

Build:
1. src/domain/mastery.ts, tests first:
   MASTERY_THRESHOLD = 80 (one exported constant, with a comment that Bright sets the final value with teachers).
   isMastered({ examPercent, anyProvisional, segments }): true only if examPercent >= threshold, no mark is still provisional, and no segment is at moved_on with 3 failed tries still open.
   recheckDueAt(achievedAt): exactly 3 days later, start of that day in Africa/Accra.
   Tests: 79 and 80 and 100; provisional marks block mastery until approved; a moved_on segment blocks; a moved_on segment later completed no longer blocks.
2. Mastery is decided on the server after submit-exam and again after each borderline approval. Write mastery_records with achieved_at and recheck_due_at.
3. Celebration screen, shown once after results when mastery is reached: "You have mastered Materials." then "You worked through every part and explained your thinking." A quiet drawing of a tick in the board style (static, or a short stroke animation that respects reduced motion). PillButton "Back to my lessons". No confetti, no badge, no points, no sound.
4. Not mastered yet: results stay as in S31, with no "failed" word anywhere.
5. Home: the topic card shows "Mastered" in teal text after mastery. Nothing is locked.
```

**You check**

- As TEST-P1, reach 80% with no stalled segment. The celebration shows once.
- As TEST-P2, reach 85% with one segment still moved on. No celebration.
- Use `scripts/approveMark.ts` on a provisional answer that pushes a pupil over 80%. Mastery appears after approval.

**Done when**

- Mastery tests pass.
- Pass and not-yet paths seen on a phone.

### S33. Spaced re-check after 3 days

**Goal:** 3 days after mastery, the app checks that the learning stayed.

**Branch:** `feat/S33-recheck`

```text
Runbook session S33: re-check. Read specs/prd.md FR-35, specs/framework.md stage 8, specs/B9.md.

Build:
1. When recheck_due_at has passed, the next time the pupil opens the app, before Home: "Quick check on Materials. 3 questions. It takes about 2 minutes." Two buttons: "Start" and "Later today". "Later today" shows it again after 4 hours or on the next app open after that, and it shows as the first card in Recommended.
2. The 3 re-check items from the content file. Same answer input as the segment loop: answer, sure or not sure, "Why do you think so?", ai-check (with all fallbacks). No read-back edit needed here; keep the read-back display.
3. Pass rule (src/domain/mastery.ts, tests first): at least 2 of 3 with a correct answer and sound reasoning. Bright may change this in one constant.
4. Pass: "Your learning has stayed with you. Well done for coming back to it." Mastery confirmed.
5. Miss: "Let's look at a few parts again." Mastery is set back quietly, the topic returns to revision, and the segments of the missed items go to Recommended. No score shown, no "failed".
6. Dev-only: on the dev screen, "Make re-check due now" for the signed-in test pupil, so it can be tested without waiting 3 days. Stripped from preview builds.
```

**You check**

- Use "Make re-check due now". Reopen the app. The re-check shows before Home.
- Tap "Later today". It sits first in Recommended.
- Pass it once (as TEST-P1) and miss it once (as TEST-P2 after mastering). Check the messages and Recommended.

**Done when (B9 gate)**

- Pass, fail and re-check paths all tested on a phone.
- Dev trigger absent from the preview build.

## B10 Dashboard: S34 to S37 (2 to 7 Dec)

B10 is done when Bright clears a flag and approves a mark from a laptop, and teachers see only their own class.

The Build Plan dates B10 at 2 to 7 Dec, overlapping B7 to B9. The rule "never start a session before the one before it is merged" still holds by default. If Bright wants B10 run in parallel in shift 3, he records that as a decision in `ops/DECISIONS.md` first. Then B10 runs on its own branches, and never edits files in `app/segment`, `app/exam` or `src/domain`.

### S34. Admin web: sign-in, shell, classes, pupils, consent

**Goal:** Bright signs in on a laptop and manages classes, pupils, code sheets and consent.

**Branch:** `feat/S34-admin-shell`

```text
Runbook session S34: admin web shell. Read specs/prd.md section 9 (items 6) and FR-1, FR-4, specs/B10.md and CLAUDE.md (Stack, rule 8).

Build app/admin/ for Expo web only (the routes must not be reachable in the Android build):
1. Staff sign-in with email and a magic link (Supabase Auth). Only users with a staff profile get in. Pupils get "This page is for teachers."
2. Layout for a laptop: left menu (Flags, Pupils, Progress, Classes, AI usage), main area, a signed-in-as line. Same paper and ink look. Tables with 1px line borders, no shadows.
3. Classes: list, create (name, level, teacher), edit.
4. Pupils: per class, add one or paste a list of first names; each gets a code from pupilCode.ts; "Print code sheet" opens the same printable sheet as S13 in the browser. Reset a PIN (clears the hash so the pupil sets a new one). Unlock a locked code.
5. Consent: per pupil, record a consent date and a form reference, or withdraw. Withdrawing sends the pupil back to the waiting screen at their next sign-in.
6. Every admin action is written to an audit table: who, what, when. No pupil text in the audit.
7. Deploy the web export to a static host chosen in the plan (EAS Hosting or Cloudflare Pages); tell me what Bright must set up. Use atlas-dev only.
```

**You check**

- On a laptop, Bright signs in, creates a test class with 3 pupils, prints the code sheet, records consent for 2.
- Sign in on Phone A with one new code. Consent gate behaves as recorded.
- Try opening `/admin` in the Android app. It is not there.

**Done when**

- Classes, pupils, code sheets and consent work from a laptop.

### S35. Flags and borderline marks

**Goal:** Bright sees every flag, acts on it, and approves or changes borderline marks.

**Branch:** `feat/S35-admin-flags`

```text
Runbook session S35: flags and borderline review. Read specs/prd.md section 9 items 1 to 3, FR-22, FR-25, FR-26, FR-30, section 10 (safeguarding), specs/framework.md stage 5 and specs/B10.md.

Build app/admin/flags:
1. Safeguarding section pinned at the top, always, in its own box. Each shows time, class, pupil display name (admin only), the job and the pupil's exact text. Actions: "Mark as handled" with a required note on what was done. Unhandled count shows in the menu.
2. Stalled flags, newest first: pupil, segment, tries, versions seen, the last reasons given. Actions: "Content fix needed" or "Human help suggested", each with a note. A stalled flag clears by itself when the pupil completes the segment (show it as "Cleared by pupil" with the date).
3. Borderline flags from segment checks: the question, the pupil's answer and reason, the AI output, and what the tie-break decided. Action: "Agree" or "Disagree" with a note. Disagreements are counted for the pilot success measure.
4. Borderline theory marks: question, scheme points, pupil answer, AI points with evidence. Actions: "Approve" or change marks per point, then save. Saving recomputes the sitting total and mastery (call the same server logic as S32).
5. Filters: by kind, class, segment, open or done.
6. Admin only. Teachers never see flags in V1 except the progress view.
```

**You check**

- Force a stalled, a borderline and a safeguarding flag from Phone A. All three show on the laptop within a minute, safeguarding on top.
- Approve a borderline theory mark. The pupil's results on the phone update and "Being checked by a teacher" disappears.

**Done when**

- Bright clears a flag and approves a mark from a laptop.

### S36. Progress table and stall counts

**Goal:** one table that shows where every pupil is.

**Branch:** `feat/S36-admin-progress`

```text
Runbook session S36: progress table and stall counts. Read specs/prd.md section 9 items 4 and 5, section 12 (success measures), specs/B10.md.

Build app/admin/progress:
1. Table per class: pupil, onboarding done, overview done, each segment 1A to 1E (complete, moved on, in progress, not started, with tries used), exam score (latest, and best), mastery, re-check result, last active.
2. Text labels, not colours alone. No red.
3. Stall counts per segment: number of pupils who moved on, and the share of wrong-reason retries that ended in sound reasoning after the second video.
4. Pilot measures box: share who finished onboarding to exam, share of segments completed within 3 tries, Paper A scores, re-check scores, AI agreement (borderline flags agreed unchanged).
5. Export CSV of the progress table (no pupil text, display names only), for the pilot report.
6. Build all counts as SQL views with RLS, not in the browser.
```

**You check**

- Compare the table with what you know TEST-P1 to TEST-P3 did. Every cell is right.
- Download the CSV. Open it in a spreadsheet. No answers or reasons inside.

**Done when**

- Progress and stall counts correct for the test pupils.

### S37. Teacher view and dashboard privacy tests

**Goal:** the class teacher sees their own class, read-only, and nothing else.

**Branch:** `feat/S37-teacher-view`

```text
Runbook session S37: teacher view. Read specs/prd.md section 9 (class teacher), section 5, specs/B10.md, CLAUDE.md rule 8.

Build:
1. A teacher signing in sees only Progress for their own class or classes. No Flags, no Pupils admin, no AI usage, no export of other classes. Read-only: no buttons that change anything.
2. Extend npm run test:rls with dashboard cases: teacher of 7A cannot read 7B progress, cannot read flags, cannot read ai_calls, cannot read audit rows, cannot write anything; admin can do all; a pupil token calling the admin views gets nothing.
3. Also test the web routes: a teacher typing /admin/flags in the address bar sees "This page is for the admin."
4. A short docs/dashboard-guide.md for the class teacher: how to sign in, what each column means, in under one page, calm second-person copy.
```

**You check**

- Sign in as the 7A test teacher on a laptop. Only 7A shows. Type `/admin/flags` in the address bar. Refused.
- `npm run test:rls` all PASS.

**Done when (B10 gate)**

- Bright clears a flag and approves a mark from a laptop.
- Teachers see only their class, proven by the RLS suite and by hand.

## B11 Low data: S38 to S39 (6 to 7 Dec)

B11 is done when the whole topic runs with only the AI checks needing the network, and no raw error is ever shown.

### S38. Whole topic offline and data measurement

**Goal:** after one download, a pupil can do the whole topic in airplane mode, and we know how much data it costs.

**Branch:** `feat/S38-offline-topic`

```text
Runbook session S38: whole topic offline. Read specs/prd.md section 11 (Offline, Data use, Speed), specs/video-board.md (P3), specs/B11.md and CLAUDE.md rule 5.

Build:
1. Content cache: the full topic content (all segments, questions, cards, exam items without answers, re-check items, worked-example photos) is stored on the phone after download, keyed by content version. Every lesson screen reads from the cache first.
2. Download screen shows the total size of videos plus posters plus captions plus photos before starting, in MB with one decimal.
3. Storage check: if the phone has less free space than the topic needs plus 50 MB, say "This phone needs <n> MB more space. Ask your teacher for help." No crash.
4. Data measurement: a dev-only counter of bytes downloaded per topic and per session (content plus videos plus API), and a report in docs/data-use.md filled in by running the full topic once on Phone A. Include: download size, data per segment for AI checks, total for one pupil end to end.
5. Offline audit: go through every screen in airplane mode after download. List any screen that needs the network for anything other than an AI check, exam submit or sync, and fix it.
6. Speed: measure cold start, screen change and video start on Phone A. Write the numbers in docs/data-use.md. Anything over 4 seconds gets a fix or a logged reason in ops/BLOCKERS.md.
```

**You check**

- Phone B: fresh install, sign in, download the topic on Wi-Fi. Then airplane mode. Do the whole topic, overview to exam submit. Only AI checks fall back to tap options. Nothing else stops you.
- Read `docs/data-use.md`. The numbers are filled in.

**Done when**

- Whole topic runs offline after download, on Phone B.
- Data use and speed written down.

### S39. Offline queue hardening and the no-raw-errors sweep

**Goal:** nothing a pupil does offline is ever lost, and every error is calm.

**Branch:** `feat/S39-queue-errors`

```text
Runbook session S39: offline queue and error sweep. Read specs/prd.md section 11 (Offline, Errors), CLAUDE.md rules 5, 6, 7 and specs/B11.md.

Build:
1. src/data/offlineQueue.ts, hardened:
   - stored on the phone in a durable store (survives app kill and phone restart)
   - every item has a client id; sending is idempotent on the server
   - sends in order per pupil, with backoff (10 s, 30 s, 2 min, 5 min, then every 10 min)
   - sends on app open, on network return, and every few minutes while open
   - items for one pupil are never sent with another pupil's session (shared phones); if a pupil signs out with items pending, they stay and send at that pupil's next sign-in, or with a server function that accepts them by pupil id and client id
   - a small dev-only queue view: count, oldest item age, last error
   Tests in src/domain for the backoff and ordering rules, written first.
2. Error sweep: find every place an error can reach the screen (fetch, Supabase, file system, video, JSON parse, unknown route). Replace each with CalmError and a retry. Add a global error boundary with "Something went wrong on this screen. Try again." and a button that reloads the screen, plus a Sentry report.
3. Search the code for alert(, console.error shown to users, raw error.message in JSX, and red colours. Show me the list and the fixes.
4. Add to docs/test-script.md a "Bad network" section: weak signal, network lost mid-upload, airplane mode mid-exam, phone restart with items queued, two pupils on one phone with queued items.
```

**You check**

- Do 3 segment attempts and an exam in airplane mode as TEST-P1. Restart the phone. Sign in as TEST-P2 and then back as TEST-P1. Turn the network on. Every item arrives once, under the right pupil.
- Run the "Bad network" section of `docs/test-script.md`. No raw error text anywhere.

**Done when (B11 gate)**

- Whole topic runs with only AI checks needing the network.
- No raw errors.
- Queued items survive a restart and a pupil switch.

## B12 Handwriting and Release: S40 to S41 (7 to 14 Dec)

S40 runs only if S00 to S39 are all merged by 7 Dec. It is first on the cut list. If it is cut, skip straight to S41 and write "S40 cut" in `ops/DECISIONS.md`.

### S40. Photo of handwriting (optional)

**Goal:** a pupil can photograph a written answer. The app reads it, the pupil confirms the text, and the photo is deleted.

**Branch:** `feat/S40-handwriting`

```text
Runbook session S40: handwriting photo. Read specs/prd.md (Answer input, section 8.1 handwriting, section 10 photos), specs/framework.md (Response formats), specs/B12.md and CLAUDE.md rules 2, 3, 9, 13.

Build:
1. A third input option on segment answers and reasons only (not the exam): "Take a photo of my writing". Uses expo-image-picker camera, compresses to max 1280 px on the long side and under 400 KB.
2. supabase/functions/ai-read-handwriting with callClaude.ts and claude-sonnet-5-5: input the image and the question text only. Output (zod): { text: string, confidence: "high"|"low", safeguarding: boolean }.
3. The pupil always sees "I read: <text>. Is that right?" with an editable TextField holding the text, and "Use this" / "Take another photo". Nothing is checked until the pupil confirms.
4. The confirmed text then goes through the normal ai-check path, with input mode "photo".
5. Photos: never written to the gallery. Sent to the function directly, not stored in Supabase Storage. Deleted from the phone's temp folder as soon as the text is confirmed or the pupil leaves the screen. Prove this in the plan.
6. Offline: the photo option is hidden. Typing and taps remain.
7. Counts toward the 120 daily AI calls.
```

**You check**

- Write 10 real answers on paper (mixed neat and messy handwriting). Photograph each on Phone A. Record in the shift log: read correctly, or corrected by the pupil. All 10 end with the right text after confirmation.
- Check the phone's gallery and file manager. No photos stored.

**Done when (B12 gate)**

- 10 real answers read or corrected.
- No photos stored on the phone or the server.

### S41. Release builds 0.9 (8 Dec) and 1.0 (14 Dec)

**Goal:** the production project is set up, final content is imported, and the release build is on every pilot phone.

**Needs:** content freeze done (5 Dec), quality gate run (7 Dec), consent forms collected, DPC registration submitted. **Bright runs the production steps himself.** The build operator runs everything else.

**Branch:** `release/0.9` (then `release/1.0`)

```text
Runbook session S41: release build <0.9 or 1.0>. Read CLAUDE.md, specs/prd.md section 12 (Definition of done) and the Build Plan pilot checklist.
The production project atlas-prod is used for the first time in this session. Stop before every step that touches atlas-prod and wait for Bright to type "go prod".

Part A: checks on atlas-dev
1. Run typecheck, lint, test, test:rls and content:check. All pass.
2. Confirm the dev-only screens (dev components, force verdict, re-check trigger, queue view, data counter) are stripped from the production profile. Search the production bundle and show me.
3. Confirm every check question marked tapOnly by the 7 Dec quality gate has tapOnly true in content/materials.json.

Part B: atlas-prod (Bright types "go prod" before each step)
4. Push all migrations to atlas-prod. Show the command first.
5. Deploy every Edge Function to atlas-prod. Bright sets the secrets himself: ANTHROPIC_API_KEY, SAFEGUARDING_EMAIL, email service key. Give him the exact commands without values.
6. Run npm run content:import -- --prod with the typed confirmation. Show the summary.
7. Run test:rls against atlas-prod with temporary test users, then delete those users.
8. Bright creates the real pilot class and pupils in the admin dashboard on atlas-prod and records consent from the signed forms. Never create real pupils from this chat.

Part C: build and install
9. Bump the version to <0.9.0 or 1.0.0> with scripts/bumpVersion.ts.
10. eas build --platform android --profile production. Give me the install link.
11. Write docs/release-<version>.md: version, date, content version string, migration list, function versions, known issues, and the install checklist below.
12. Write the pilot install checklist: per phone, install, open, sign-in screen shows, download the topic on the router, confirm "Topic ready", play 5 seconds of the overview with sound, airplane mode test, battery charged to 100%, phone labelled with a number.
```

**You check**

- Every pilot phone passes the install checklist. Tick each phone by number on paper and in the shift log.
- On one pilot phone, sign in with a real pupil code, do onboarding, and play the overview. Then have Bright reset that pupil in the dashboard.
- For 1.0 on 14 Dec: only fixes from the 12 to 14 Dec window are in the build (crashes, wrong marks, the top 3 problems). Compare the git log against `ops/BUGS.md`.

**Done when (Release gate)**

- Release build installed on every pilot phone.
- Every item in `specs/prd.md` section 12 is either ticked or has a named reason and owner in `ops/STATUS.md`.

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
