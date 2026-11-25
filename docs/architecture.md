# ATLAS V1 architecture

One page. Written in S14 (26 Nov 2026). Update it when a session changes the shape of the system.

## The pieces

ATLAS is one Expo codebase with two outputs:
- an Android app for pupils
- a web export for the admin and teacher dashboard

Supabase holds the data, signs pupils in and runs the AI jobs. Videos come from Cloudflare R2.

```
Phone (Expo app)                       Supabase (atlas-dev now, production at S41)
  screens (app/)                         Postgres + Row Level Security
  rules (src/domain, pure TS)            Auth (one auth user per pupil)
  phone database + outbox (S15)  --->    Edge Functions:
  video cache (S20)                        pupil-signin (S10)
        |                                  ai-overview, ai-check, ai-mark-theory,
        | MP4 once, then from the phone     ai-read-handwriting (S16 gateway on)
        v                                       |
  Cloudflare R2 (videos, captions)              v
                                          Claude API (key in Supabase secrets only)
Web dashboard (same codebase, app/admin, static web export) ---> same Supabase
```

## Data flow

1. **Sign-in.**
   - The pupil types a code and PIN.
   - `pupil-signin` checks the PIN against a bcrypt hash inside Postgres and returns a normal Supabase session (D-36).
   - From then on every query runs as that pupil, and RLS limits it to their own rows.
2. **Content.**
   - `content/materials.json` is checked by `src/data/contentSchema.ts`, then loaded into the content tables by `npm run content:import` (S09).
   - The app reads it once per topic and keeps it on the phone (S20).
3. **Pupil actions** (answers, reasons, overview text).
   - Each action is written to the phone database first, then sent through the outbox with an idempotency key (S15).
   - A lost connection never loses work and never blocks the lesson.
4. **AI.**
   - The app never calls Anthropic.
   - It calls an Edge Function, which goes through the one AI gateway (S16). The gateway checks the daily caps, sends `pupil_id` and the pupil's words (never a name), checks the reply with zod, retries once, and logs to `ai_calls`.
   - On failure or after 20 seconds it falls back to tap options.
5. **Next video.**
   - Chosen on the phone by `src/domain/routing.ts` from misconception codes and interests (S23). Never by AI.
6. **Progress.**
   - Owned by the server: a trigger on `attempts` sets segment status (D-29).
   - Exam objective items are scored on the server (D-28).
7. **Video.**
   - MP4 from R2 is downloaded once with `expo-file-system` and played from the phone with timed captions (S21).

## Folder map

| Folder | Holds |
| --- | --- |
| `app/` | Routes. `(auth)/sign-in`, `notice`, `waiting`, `onboarding/`, `(lessons)/` (home, topic, segment, exam, results, all behind `PupilGuard`), `admin/` (web), `dev/` (dev builds only) |
| `src/domain/` | Pure rules with Jest tests: auth, lockRule, nextScreen, routeGuard, pupilCode. ESLint refuses React, React Native and Expo imports here. CI requires 95% line coverage |
| `src/data/` | Supabase client, env check, content schema, Sentry scrubber, pupil auth calls, stores |
| `src/components/` | UI by feature: `common/` (theme, copy, buttons), `auth/` |
| `supabase/migrations/` | SQL only. Never change the database by hand |
| `supabase/functions/` | Edge Functions (Deno). `pupil-signin` today |
| `scripts/` | Dev and ops scripts (seed, RLS tests, sign-in test, content import, pupil codes). All refuse anything but atlas-dev, or a local stack in CI |
| `docs/`, `docs/runbook/` | Test script, path checklist, CI setup, one runbook prompt per session |
| `ops/` | Status, handover, decisions, blockers, bugs, shift logs |
| `.claude/` | Claude Code settings, hooks and slash commands (S14) |
| `.github/workflows/` | CI on every pull request into `main` (S14) |
| `.maestro/`, `.eas/workflows/` | End-to-end phone flows (S14) |

## Where each rule that never bends is enforced

| Rule | Enforced by |
| --- | --- |
| 1. Claude key only in Supabase secrets | No key anywhere in the app. Gateway in S16. `.claude/settings.json` blocks reading `.env` files |
| 2. No pupil name to the AI | S16 gateway builds the input from `pupil_id` and the pupil's words only, with a test. Sentry scrubber removes `name` (D-18) |
| 3. zod on every AI output, retry once, fallback | S16 gateway, with failure tests |
| 4. Next video by `routing.ts`, never AI | S23, `src/domain/routing.ts` with tests |
| 5. Network never traps a pupil | Outbox (S15), video cache (S20), 20-second AI limit with tap fallback (S16). Sign-in has a calm offline message (S11) |
| 6. No streaks, XP, red, time pressure | `src/components/common/copy.test.ts`: no red colour, no colour outside the theme. Review prompt P5 item 6 |
| 7. Calm copy, no exclamation marks or em dashes | `copy.test.ts` and `pupilCopy.test.ts` today. Copy check script in CI from S17 |
| 8. RLS on every table | Every migration enables RLS. `npm run test:rls` (166 checks) runs on atlas-dev and on a local stack in CI |
| 9. Log every AI call | `ai_calls` table exists (S06). The gateway writes it (S16) |
| 10. Tests first, never weakened | `src/domain` tests, CI on every pull request, 95% coverage gate, review prompt P5 item 3 |
| 11. No free chat with the AI | No chat route exists. Review prompt P5 |
| 12. English only | No i18n library. Review |
| 13. 120 calls per pupil per day, global cap | `app_settings` table holds the global cap. The gateway counts `ai_calls` (S16) |
| 14. Safeguarding verdict | S16 gateway: neutral message, flag, alert email through a database outbox |
| 15. No real pupil data, no production | `scripts/lib/devTarget.ts` `assertAtlasDev` in every script. The `pupils:create` class name must start with "Test ". `.claude/settings.json` denies any command containing `atlas-prod` |
