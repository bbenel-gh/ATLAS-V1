# ATLAS V1: instructions for Claude Code

Version: 24 November 2026. This file replaces every earlier CLAUDE.md (the August Expo file and any Flutter file).
Only Bright may change this file.

## Shift protocol (read before anything else)

This computer and this Claude account are shared. People work in 5-hour shifts, one person at a time.
Claude does the coding and the drafting. People give instructions, check results and decide.

At the start of every conversation:
1. If the first message does not say who the person is, ask for their name, role and shift goal.
2. Read `ops/STATUS.md` and `ops/HANDOVER.md`. Summarise in 5 lines: where the project stands, what the last shift left unfinished, open blockers, and what this shift should do first.
3. Check the person's role in the role table below. Only change files their role allows. If asked for anything outside their role, say so and offer to log it in `ops/BLOCKERS.md`.

During the shift:
- Plan first. Wait for approval before changing any file.
- After each finished task, add one line to the shift log: `ops/shifts/<date>-<shift number>-<role>.md`.
- Never ask for, repeat or store passwords, keys or pupil personal data.
- If a request conflicts with `specs/` or this file, quote the conflicting line and stop.

When the person says "End shift":
1. Rewrite `ops/HANDOVER.md` from its template and update `ops/STATUS.md`.
2. Finish the shift log.
3. List every uncommitted change and propose one commit message. Never push to `main`.
4. Write a 5-line summary for the team WhatsApp group.

### Role table

| Role | May change |
| --- | --- |
| Bright (owner) | Everything |
| Build operator | `app/`, `src/`, `supabase/`, `scripts/`, `docs/`, `assets/`, `content/materials.json` (import only), `ops/` |
| Science content reviewer | `content-work/packs/`, `content-work/scripts/`, `ops/` |
| Video producer, voice-over artist | `content-work/media/`, `ops/` |
| QA tester | `ops/BUGS.md`, `docs/test-script.md`, `ops/shifts/` |
| Data protection consultant | `content-work/legal/`, `ops/` |
| Pilot coordinator | `content-work/pilot/`, `ops/` |

Only Bright may change `CLAUDE.md`, anything in `specs/`, or the final `content/materials.json`.

Decisions: any decision marked for Bright (in `ops/`, the runbook or `specs/`) may be made by whoever is on shift. Record it in `ops/DECISIONS.md` with the person's name, role and the date. Changing `CLAUDE.md`, `specs/` or the final `content/materials.json`, and merging into `main`, stay with Bright.

## What we are building

ATLAS V1 is an Android app (Expo) plus a web admin and teacher dashboard (Expo web export, same codebase).
It teaches one topic: Basic 7 Integrated Science, Diversity of Matter: Materials. That is one overview plus five segments (1A to 1E).
V1 is the main ATLAS product for this topic, not only a pilot. It stays in use for one to two months until the next update.
The pilot class at Detieso D/A Basic School uses it first: pilot days are 9 to 11 December 2026. V1.0 is released on 15 December 2026, to the pilot class and to the public.
It is shared as an APK by public link. A public Play Store listing follows once the closed-test requirement is met (`specs/prd.md` section 4).
Pupils join by self sign-up or with an admin-issued code, always with a 4-digit PIN and never with a child email or phone number. Admins manage pupils. Each pupil states their school; an admin may link it to a row in `schools`.
Public self sign-up is built in full but stays off until the admin switches it on, after the data protection consultant confirms it is covered.

The lesson design source of truth is `specs/framework.md`. The product source of truth is `specs/prd.md`. If this file and either of them disagree, stop and ask.

Ignore anything from earlier ATLAS documents about: KG to SHS or nursing scope, FSRS, SOLO levels, seven-phase lessons, mastery colours, Paystack or payments, an AI tutor chat, the teacher avatar, Flutter, Twi or any language other than English.

## Stack

- Expo (latest stable SDK), React Native, TypeScript strict mode, Expo Router
- Supabase: Postgres with Row Level Security, Auth, Storage, Edge Functions (TypeScript)
- Videos: MP4 files on Cloudflare R2, downloaded once with `expo-file-system` and played from the phone
- State: Zustand for UI state, TanStack Query for server state
- Validation: zod for the content file and for every AI output
- Tests: Jest for everything in `src/domain`
- Errors: Sentry
- Builds: EAS Build, internal distribution (APK), profile `preview`
- AI: Claude API, called only from Supabase Edge Functions. Models: `claude-sonnet-5-5` for answer checks, theory marking and handwriting; `claude-haiku-5-5` for the overview listening job

## Folder layout

```
app/                     routes: (auth)/, onboarding/, home/, topic/[id]/, segment/[id]/, exam/[id]/, results/[id]/, admin/ (web only)
src/domain/              pure TypeScript rules: routing.ts, tries.ts, mastery.ts, examTimer.ts, scoring.ts. No React imports. Fully unit tested.
src/data/                Supabase client, content loader (contentSchema.ts), video cache, offline queue
src/components/          UI pieces by feature (lesson, board, exam, admin, common)
supabase/migrations/     SQL migrations only. Never change the database by hand.
supabase/functions/      ai-overview, ai-check, ai-mark-theory, ai-read-handwriting, pupil-signin
content/materials.json   the topic content, validated by src/data/contentSchema.ts
specs/                   prd.md, framework.md, video-board.md, data-model.md, ai-prompts.md, B0.md to B12.md
scripts/                 importContent.ts and other one-off scripts
docs/                    test-script.md, path-checklist.md
ops/                     STATUS, HANDOVER, DECISIONS, BLOCKERS, BUGS, ROTA, shifts/
content-work/            packs/, scripts/, media/ (notes only), legal/, pilot/
```

Video and audio files never go in the repo. They live in `C:\ATLAS\media` and on R2.

## Rules that never bend

1. The Claude API key lives only in Supabase secrets. The app never calls Anthropic directly.
2. Never send a pupil's name to the AI. Send `pupil_id`, the question and the pupil's words only.
3. Parse every AI output with zod. Invalid output: retry once, then return `{ fallback: true }` and the app offers tap options.
4. Choosing the next video is the rule in `src/domain/routing.ts`. It is never an AI call.
5. The network never traps a pupil mid-lesson. Videos are cached. If an AI check fails or times out (20 seconds), offer tap options and queue the text.
6. No streaks, XP, badges, leaderboards, red flashes, guilt messages or time pressure outside the exam.
7. Copy is calm, second person, short sentences. No exclamation marks. No em dashes.
8. Row Level Security on every table. A pupil reads only their own rows, a teacher their own class, an admin everything.
9. Log every AI call in the `ai_calls` table: job, model, pupil_id, input, output, ok, latency.
10. Write the tests in `src/domain` first, then the code. Never skip, delete or weaken a test to make it pass.
11. Pupils never chat freely with the AI. There is no open chat screen anywhere.
12. English only. Do not add language selection, translation or support for any other language.
13. At most 120 AI calls per pupil per day across all jobs, and never more than the admin-set global daily cap across all pupils.
14. A safeguarding verdict shows the pupil a neutral message, shows no verdict for that answer, and creates a safeguarding flag with an alert to the admin.
15. Never touch real pupil data or the production project from a Claude Code session. Development uses the `atlas-dev` Supabase project.

## Lesson rules (summary of specs/framework.md)

- Onboarding: name, class, interests, 3 playful choices. Nothing is right or wrong. Under 3 minutes.
- Home: "Choose a topic" (free choice) and "Recommended for you". A missing prerequisite gives a nudge with "Take me to the class topic anyway". Never block.
- Topic start: overview video, then "Tell a friend what this video was about" and "Which part felt confusing?", sent to ai-overview, saved to the profile, never shown as a grade.
- Segment loop: watch a video version, answer (typing by default, tap options available), sure or not sure tap, then "Why do you think so?" (every time, right or wrong), then ai-check, then a read-back of what the pupil meant.
  - Answer correct and reasoning sound: segment complete.
  - Otherwise one try is used. Before try 2 and try 3, `routing.ts` picks the next unseen version from the pupil's misconception codes, ties broken by interests. No unseen version left: show the worked-example card.
  - After 3 failed tries: "We'll come back to this one. You're not behind.", flag to admin, add the segment to Recommended, move on.
- Exam: unlocks when every segment is complete or moved on. Timer, objective section then theory section, stop-work sound, auto-submit at zero. No feedback until submission. Borderline theory marks show "Being checked by a teacher" until an admin approves. A retake uses Paper B.
- Mastery: exam score at least 80% and no segment left at 3 failed tries, confirmed by 3 re-check questions 3 days later. A missed re-check sends the topic back to revision quietly.

## Lesson video player (summary of specs/video-board.md)

Segment and overview videos use the "board" style: handwriting on a paper-coloured board, narrated, with timed English captions under the board.
- The video area has no frame, no shadow and no visible player controls. Its background matches the board colour exactly.
- It starts automatically. Tap the board to pause or continue. It pauses when the app goes to the background or the board scrolls off screen.
- Captions come from a timed cue file per video version and follow the video frame by frame.
- At the end the last frame stays on screen, then the check question appears below it. "Watch again" restarts the same version.

## Look

App tokens (from `BRAND-HANDOFF.md`, primary "paper and ink" system): paper `#F2F4F3`, ink `#16233E`, inkSoft `#4C566B`, gold `#B9852F`, goldSoft `#E9D2A4`, teal `#2F6F5E`, tealSoft `#D6E7E1`, line `#DDE2DE`, card `#FCFCFA`.
Board tokens (lesson video area only): board `#F6F0E6`, boardInk `#1C2740`, boardMuted `#6B6558`, boardLine `#E4DCCB`.
Pill buttons and inputs, rounded cards with a 1px line border, no shadows. Body text Inter 16px. Headings Fraunces. Labels IBM Plex Mono.
Errors use plain text and a retry button, never a red flash. Wrong answers are never shown in red.

## Workflow for every task

1. Read this file and the step's spec in `specs/`. Propose a plan listing the files you will change. Wait for approval.
2. One runbook session per branch, named like `feat/S18-routing`. Never build two sessions on one branch.
3. Run `npm run typecheck`, `npm run lint` and `npm test`. All three must pass before you say a task is done.
4. End every session with its "Done when" list, each line marked proven or not proven, and how you checked.
5. Write the pull request description in plain English: what changed, how to test it on a phone, risks.
6. A review always runs in a new conversation. Never approve your own work.
