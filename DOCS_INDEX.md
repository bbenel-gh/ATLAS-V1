# ATLAS docs index: what is current

Version: 22 November 2026. Read this first. If two documents disagree, the one higher in this list wins.

## Current (source of truth for V1)

| Rank | Document | Where | Holds |
| --- | --- | --- | --- |
| 1 | `CLAUDE.md` | Project and repo root | Rules for Claude Code, shift protocol, role table |
| 2 | `ATLAS_PRD.md` | Project; repo `specs/prd.md` | What V1 is, every requirement, definition of done |
| 3 | `ATLAS_LESSON_FRAMEWORK.md` | Project; repo `specs/framework.md` | The lesson design, stage by stage |
| 4 | `specs/video-board.md` | Repo (and this rewrite's files) | Board-style lesson video and player |
| 5 | `ATLAS_V1_BUILD_PLAN.md` | Project | Team, shifts, dates, build order, risks, decisions |
| 6 | ATLAS V1 Shift Workflow | Claude Doc | Shift routine, prompts, role cards, ops file templates |
| 7 | ATLAS V1 Build Guide | Claude Doc | Build guide, Claude Code pack (specs B0 to B12, data model, AI prompts), Claude Code runbook (S00 to S41), Role playbooks |
| 8 | ATLAS Lesson Framework v1 | Claude Doc | The original of rank 3 |
| 9 | ATLAS lesson: seamless board demo | Artifact | Working demo of the board video style |
| 10 | `BRAND-HANDOFF.md` | Project | Visual identity (use the primary "paper and ink" system) |

## Conflicts settled in this rewrite

| Conflict | Settled as | Why |
| --- | --- | --- |
| Who writes code: a hired lead developer (Build Guide) or Claude with a build operator (Shift Workflow) | Claude writes all code; a build operator runs the sessions | The Shift Workflow is newer and matches how the team will work |
| Claude Team plan with one seat per hire (Build Guide) or one ATLAS account on one shared computer (Shift Workflow) | One ATLAS Claude account on the Max plan, one shared computer, 5-hour shifts | Same reason |
| V1 = learning app (Build Guide) or report card system (Report Season Ready doc) | Learning app. The report card system is a separate product, not in V1 | Four of the six current documents describe the learning app |
| Materials (Build Guide) or Mathematics (board demo, earlier plans) | Materials, unless Bright overrides by 23 Nov | The Build Guide made this call with reasons; the demo only shows the video style |
| Brand: `BRAND-HANDOFF.md` tokens or the August `CLAUDE.md` colours | `BRAND-HANDOFF.md` paper and ink, plus board colours for the video area only | The August colours are superseded |
| Twi or other languages (Report Season doc) | English only | Bright's decision |
| Play Store launch on 15 Dec | Pilot APK release on 15 Dec; Play Store after | Google's 12-tester, 14-day closed test rule for new personal accounts |
| Earlier chat build list (JHS Mathematics, FSRS-era stack) | Superseded by this set | Written before these documents were shared |

## Retired (keep for history, do not build from)

| Document | Replaced by |
| --- | --- |
| August `CLAUDE.md` (Expo, KG to Nursing) | New `CLAUDE.md` |
| August `ATLAS_PRD.md` (KG to Nursing, FSRS, Paystack, Citadel) | New `ATLAS_PRD.md` |
| `workstream1learningtheoryfoundation.md` | `ATLAS_LESSON_FRAMEWORK.md` |
| `workstream2purposelayer.md` | `ATLAS_LESSON_FRAMEWORK.md` (goals) |
| `workstream3assessmentmasteryarchitecture.md` | `ATLAS_LESSON_FRAMEWORK.md` (Stages 4 to 8) |
| `workstream4instructionaldesignframework (1).md` | `ATLAS_LESSON_FRAMEWORK.md` |
| `workstream5retentionspacingengine.md` | Stage 8 spaced re-check (FSRS is not in V1) |
| `workstream6productarchitectureuiux.md` | `ATLAS_PRD.md` and `BRAND-HANDOFF.md` |
| `workstream7implementationroadmap.md` | `ATLAS_V1_BUILD_PLAN.md` |
| `ATLAS_BUILD_WORKFLOW.md` (referenced, never in the project) | `ATLAS_V1_BUILD_PLAN.md` |
| "ATLAS V1: Step-by-Step Build Guide to 15 December 2026" (empty Claude Doc, Flutter) | ATLAS V1 Build Guide |
| "ATLAS V1 Build Plan: Report Season Ready" (Claude Doc) | Not in V1. Separate ATLAS Admin product |

Some ideas in the retired workstreams may return after V1, for example spaced repetition across many topics. Bring them back through a new decision, not by building from the old files.
