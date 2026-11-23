# ATLAS V1 status

Last updated: 23 November 2026, by the build operator in shift 1.

## Where the project stands

Session S00 is **part done and not proven**. Every file is written, but
`npm install` has not finished, so nothing has been typechecked, linted, tested
or displayed. No lesson content, no database, no accounts. Git is not
initialised.

An earlier version of this file said S00 was done. That was wrong.
See the correction note in `ops/HANDOVER.md`.

| Step | Sessions | State |
| --- | --- | --- |
| B0 Setup | S00 to S04 | S00 part done, not proven. S01 to S04 not started |
| B1 Data model and content | S05 to S09 | Not started |
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

## What is written

Written means the file exists. It does not mean it runs. Nothing in this list
has been typechecked, linted, tested or displayed.

- `package.json` pinned to Expo SDK 58.0.26, React Native 0.88.1, React 19.3.0, TypeScript 6.0.3, strict mode on.
- Expo Router, routes in `app/` at the repo root.
- `app/index.tsx`, a placeholder screen meant to show "ATLAS" in Fraunces on paper.
- `app/_layout.tsx`, which loads eight font weights at runtime so Expo Go works.
- `src/theme.ts` holds every app token and board token from CLAUDE.md, with `src/theme.test.ts` guarding each value.
- Web export set to `single`. SDK 58 defaults this to `server`, so it is set on purpose.

## What is installed

`npm install` has not finished. Only the base Expo dependencies were attempted,
and they are incomplete. Supabase, zod, zustand, TanStack Query, AsyncStorage,
expo-video, expo-audio, expo-crypto, expo-file-system, the four font families,
jest-expo and jest are **not** installed.

## Dates

Content freeze 5 December. Feature freeze 8 December. Pilot 9 to 11 December.
Release to the pilot class 15 December. Spaced re-check 18 December.

## Next

Finish S00 before anything else. The ordered list is in `ops/HANDOVER.md` under
"What the next shift should do first". It starts with letting `npm install`
finish and ends with the first commit.

After that, S01 to S04, to reach the B0 "Done when": a "Hello ATLAS" build
installs on both test phones from a link. That needs an Expo account and an EAS
build profile, which do not exist yet. See BL-5 in `ops/BLOCKERS.md`.
