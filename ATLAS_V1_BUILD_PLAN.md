# ATLAS V1 Build Plan

Version: 22 November 2026. Owner: Bright Oppong.
This plan replaces `workstream7implementationroadmap.md` and the missing `ATLAS_BUILD_WORKFLOW.md`. It also replaces the "Working with Claude" section of the ATLAS V1 Build Guide (Claude Team plan, one seat per hire).
It summarises the plan. The exact steps live in three Claude Docs that stay current: the ATLAS V1 Build Guide (Build guide, Claude Code pack, Claude Code runbook, Role playbooks) and the ATLAS V1 Shift Workflow.

## 1. The plan in five lines

1. V1 is the Basic 7 Science "Materials" topic, run by one Detieso class on pilot phones, released on 15 December 2026.
2. Claude writes all code and drafts. People instruct, check and decide. Nobody on the team writes code.
3. Work happens on one shared computer, with one ATLAS Claude account on the Max plan, in four 5-hour shifts a day.
4. Three dates hold the plan: content freeze 5 December, feature freeze 8 December, release 15 December.
5. Bright approves anything that reaches pupils, every merge into `main`, and every change to `CLAUDE.md` or `specs/`.

## 2. Key dates

| Date | Milestone |
| --- | --- |
| Sun 22 Nov | Docs rewritten. Role briefs posted. Accounts opened |
| Mon 23 Nov | Open decisions settled. Segment list confirmed. Headteacher called. Shared computer set up |
| Tue 24 Nov | First build shift. Session S00 (repo files) and S01 start |
| Fri 27 Nov | All video scripts signed off by Bright |
| Tue 1 Dec | Sprint 1 demo: whole learner flow on a test phone. DPC registration submitted. Optional: Play Store closed test starts |
| Sat 5 Dec | Content freeze: all videos uploaded, content file final. Consent forms collected |
| Mon 7 Dec | AI quality gate run. Failing items made tap-only |
| Tue 8 Dec | Feature freeze. Release build 0.9 on all pilot phones |
| Wed 9 to Fri 11 Dec | Pilot days at Detieso |
| Sat 12 to Mon 14 Dec | Fix window: crashes, wrong marks, top 3 problems only |
| Tue 15 Dec | V1.0 released to the pilot class. Dashboard handed to the class teacher |
| Fri 18 Dec | Spaced re-check for pupils who reached mastery |

## 3. Team

| Role | Who | Dates | Delivers |
| --- | --- | --- | --- |
| Owner, product and science lead | Bright | 22 Nov to 15 Dec | Decisions, content approval, school relationship, review shift every night |
| Co-lead | Claude | Every shift | Code, specs, content drafts, test plans, reviews, handovers |
| Build operator (contract) | To hire, or Bright | 24 Nov to 14 Dec | Runs the Claude Code runbook session by session and checks every result on a phone. Judges plans; does not write code |
| Science content reviewer (contract) | To hire: a practising JHS science teacher | 23 Nov to 7 Dec | Checks content packs, scripts and reason keys; hand-marks the 100-answer quality-gate sample |
| Video producer and editor (contract) | To hire | 27 Nov to 5 Dec | 11 board-style videos to `specs/video-board.md` |
| Voice-over artist (contract) | To hire | 28 Nov to 4 Dec | Clear Ghanaian English narration |
| QA tester (contract) | To hire | 3 Dec to 14 Dec | Daily runs on both low-end phones; bug reports in `ops/BUGS.md` |
| Data protection consultant (contract) | To hire | 23 Nov to 5 Dec | DPC registration, privacy notice, parent consent form, pupil AI notice |
| Pilot coordinator | A Detieso teacher, with a stipend | 5 Dec to 12 Dec | Collects consent forms, runs pilot sessions, keeps observation sheets |

Hiring tests (from the Build Guide): the build operator does a paid 2-hour task in Claude Code and is judged on whether they question Claude's output; the video producer makes a 60-second clip on "what a material is"; the content reviewer must find both deliberate errors in 5 draft check questions. Every contract has deliverables and dates, payment by milestone, IP assignment to ATLAS, confidentiality, and a child-safeguarding clause.

## 4. How the work runs

Full detail: the ATLAS V1 Shift Workflow doc.

### 4.1 Shifts

| Shift | Time | Main use | Who |
| --- | --- | --- | --- |
| 1 | 06:00 to 11:00 | Build: runbook sessions in Claude Code | Build operator |
| 2 | 11:00 to 16:00 | Content and paperwork | Booked in `ops/ROTA.md` |
| 3 | 16:00 to 21:00 | Build (see decision D-1 below) | Build operator |
| 4 | 21:00 to 02:00 | Review: plans, handovers, pull requests, decisions | Bright |

Every shift starts with the start-of-shift prompt and ends with the end-of-shift prompt. Nothing lives only in a chat: every result is a file in the repo. Commit and push at least every 45 minutes.

### 4.2 The work loop for every task

1. Instruct: one task per message, in Plan mode.
2. Approve or correct the plan. Then switch to Manual mode.
3. Claude works. Read every command before allowing it.
4. Check: open the file, run the test, look at the phone. Never accept "done" on Claude's word.
5. Save: shift log line, commit, push.

For build sessions add: typecheck, lint and tests pass; a second-opinion review in a new conversation; a pull request that Bright merges in shift 4.

### 4.3 Build order

The build follows the Claude Code runbook, sessions S00 to S41, in order. Never start a session before the one before it is merged.

| Step | Sessions | Dates | Done when |
| --- | --- | --- | --- |
| B0 Setup | S00 to S04 | 24 to 25 Nov | A "Hello ATLAS" build installs on both test phones from a link |
| B1 Data model and content | S05 to S09 | 26 Nov | Draft content loads with one command; a pupil cannot read another pupil's rows |
| B2 Accounts | S10 to S13 | 26 to 27 Nov | 3 test pupils sign in on 2 phones; PIN lock works; consent gate works |
| B3 Onboarding | S14 | 27 Nov | Under 3 minutes, resumable, all answers saved |
| B4 Home | S15 | 28 Nov | Both sections open the topic; prerequisite nudge tested and skippable |
| B5 Overview | S16 to S17 | 28 to 29 Nov | Works offline after download; profile updates when the network returns |
| B6 Segment loop | S18 to S24 | 29 Nov to 1 Dec | Routing and tries tests pass; every path forced on a phone |
| B7 AI hardening | S25 to S27 | 2 to 3 Dec | Bad JSON, timeout, cap and safeguarding tested; network loss never traps a pupil |
| B8 Exam | S28 to S31 | 3 to 5 Dec | Auto-submits at zero after app restart; results match a hand-marked copy |
| B9 Mastery | S32 to S33 | 5 to 6 Dec | Pass, fail and re-check paths tested |
| B10 Dashboard | S34 to S37 | 2 to 7 Dec | Bright clears a flag and approves a mark from a laptop; teachers see only their class |
| B11 Low data | S38 to S39 | 6 to 7 Dec | Whole topic runs with only AI checks needing network; no raw errors |
| B12 Handwriting | S40 | 7 Dec, only if S00 to S39 are merged | 10 real answers read or corrected; no photos stored |
| Release | S41 | 8 Dec (0.9) and 14 Dec (1.0) | Release build installed on every pilot phone |

### 4.4 Changes to the existing specs from today's rewrite

Apply these in session S00, when the specs are copied into the repo.
1. Use the new `CLAUDE.md` from this rewrite, not the one in the Claude Code pack (section 2). The new one adds the shift protocol, the role table and the video player rules.
2. Add `specs/prd.md` (this rewrite's `ATLAS_PRD.md`), `specs/framework.md` (this rewrite's `ATLAS_LESSON_FRAMEWORK.md`) and `specs/video-board.md`.
3. In `specs/data-model.md`, add to `video_versions`: poster URL, captions URL, board colour, duration in seconds.
4. In `specs/B1.md` (session S08), add the same four fields to the content schema.
5. In `specs/B5.md` and `specs/B6.md`, add: "The video player follows specs/video-board.md."

## 5. Content production

Full detail: the Build Guide, "Content production" section, and the content pack prompt in the Claude Code pack.

1. 23 Nov: Bright confirms the segment list and writes the misconception list per segment with the reviewer.
2. 23 to 25 Nov: Claude drafts every content pack in shift 2. Bright and the reviewer correct every line.
3. 27 Nov: Bright signs off all scripts. Changes after this go through Bright only.
4. 28 Nov to 4 Dec: voice-over recorded, board videos made, captions and cue files exported.
5. Within 24 hours of each delivery: Bright watches the video against its script and tags, then approves or sends timestamped notes.
6. 5 Dec: content freeze. After this, only error fixes.

## 6. Paperwork before any pupil touches the app (by 5 Dec)

1. Written approval from the headteacher for a 3-day pilot.
2. A signed parent consent form for every pilot pupil, explained in person.
3. Data Protection Commission registration submitted (target 1 Dec). The consultant confirms whether the pilot can run while it is pending.
4. A public ATLAS page with the privacy notice and the AI notice.

## 7. Pilot

| Day | Pupils do | Team watches for |
| --- | --- | --- |
| Wed 9 Dec | Sign in, onboarding, overview, segments 1A and 1B | Where pupils hesitate, misread, or ask for help |
| Thu 10 Dec | Segments 1C, 1D, 1E | Whether the second video helps after a wrong reason |
| Fri 11 Dec | Timed exam, results, feedback questions | Timer stress, understanding of results |

Before day 1: phones charged, release build installed, all videos downloaded on every phone, router charged with data, pupil codes printed, consent forms checked against the class list. One adult per 5 pupils. Adults do not help with content; they write down what they see. Bright reviews admin flags each evening.

## 8. Risks

| Risk | Early sign | Response |
| --- | --- | --- |
| Build capacity runs short after 2 Dec | Sessions S25 to S37 not merged on schedule | Decision D-1 below; then the cut list |
| Claude usage limits hit | Weekly usage above 80% | Bright decides on extra usage or shorter content shifts |
| No build operator hired by 24 Nov | No candidate passes the paid test | Bright runs shifts 1 and 3 himself |
| Videos late | OV and 1A not delivered by 29 Nov | Cut 1E; switch remaining version b videos to narrated photo slides |
| AI marks disagree with the reviewer | Quality gate below target on 7 Dec | Affected items become tap-only for the pilot |
| No network at the school | Router test on 8 Dec fails | Everything pre-downloaded; AI checks fall back to tap options; free text checked when the router reconnects |
| School not in session 9 to 11 Dec | Headteacher call on 23 Nov | Move the pilot to the nearest 3 school days before 15 Dec |
| Consent or registration not ready | Forms missing on 5 Dec | Pilot only with pupils whose forms are signed |
| Power cut or computer failure | Lost work | UPS, mobile router backup, push every 45 minutes |
| Scope creep | New feature ideas after 1 Dec | V1.1 list; nothing new after feature freeze |

### Cut list (cut in this order if behind)

1. Photo of handwriting (B12, S40)
2. Segment 1E and its videos
3. Segment stall counts in the dashboard
4. Celebration screen polish
5. Paper B (retake reuses Paper A items in a new order, flagged in the results)

Never cut: the explain-why step, the 3-try ceiling with flags, the AI notice, consent, or the quality gate.

## 9. Decisions for Bright

| ID | Decision | Recommendation | Due |
| --- | --- | --- | --- |
| D-1 | Keep shift 3 for building until 7 Dec | **Yes.** After 2 Dec, 17 build sessions (S25 to S41) must fit in about 6 days. With only shift 1 that is about 3 sessions per shift, which is not realistic. The QA tester tests on the phones outside shifts and logs bugs in a 1-hour slot at the start of shift 2 | 23 Nov |
| D-2 | Materials (Science) or Mathematics for V1 | Materials. The framework was designed on it, and it avoids maths notation and handwritten maths in V1. The board demo uses a maths example only to show the video style | 23 Nov |
| D-3 | Play Store closed test from 1 Dec | Optional. It is not needed for the pilot. Start it only if 15 or more testers are ready, so a public listing can follow soon after 15 Dec | 30 Nov |
| D-4 | Who acts on safeguarding alerts, and how fast | Bright, same day, with a named backup at the school | 23 Nov |
| D-5 | Budget ceiling and pilot class size | Bright | 23 Nov |
| D-6 | Report card system (ATLAS Admin) | Not in V1. It is a separate product with its own plan. Revisit after 18 Dec | 23 Nov |

## 10. V1.1 list (after 15 Dec)

Play Store public listing, Mathematics topic, voice input, parent progress view, more video versions per segment, flag triage rules.
