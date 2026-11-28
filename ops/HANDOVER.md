# Handover

Rewritten at the end of every shift. The next person reads this first, then
`ops/STATUS.md`.

---

## Date and shift

Tuesday 24 November 2026, shifts 1 and 2 (06:00 to about 13:45). One conversation.

## Who

Bright (owner), identified in chat on the shared account.

## Finished

- **D-16** on `chore/decision-rights`, commit `fb6790f`. Any decision marked for Bright may be made by whoever is on shift, recorded in `ops/DECISIONS.md` with name, role and date. Changes to `CLAUDE.md`, `specs/`, the final `content/materials.json`, and merges into `main`, stay with Bright. Both copies of `CLAUDE.md` updated (repo and `Desktop\CLAUDE.md`, version 24 November 2026).
- **S02** on `feat/S02-theme`, commit `fc978ff`. Theme at `src/components/common/theme.ts`, fonts cut to the runbook set, seven shared components, reduced motion hook, teal focus ring, dev gallery at `/dev/components` (button on the sign-in placeholder in dev builds), placeholders on Screen + Heading, copy and colour guard test.
- **S03 code** on `feat/S03-supabase-sentry`, not yet committed (see below). zod env check, Supabase client, health check (D-17), Sentry with pupil-field scrubber (D-18), React Query, UI store, `supabase init`, two dev gallery buttons. Typecheck, lint, test (126 tests) and both exports pass. Secret search clean.

## Not proven (honest list)

- Nobody has seen any screen render yet, in a browser or on a phone. This now covers S01, S02 and S03.
- S02: components on Phone A, reduced motion on a phone (BL-8).
- S03: "Connected to atlas-dev" and a scrubbed test event in Sentry.

## In progress

Branch `feat/S03-supabase-sentry`. Next exact steps:

1. Commit S03 with the message proposed at the end of this shift, if not already done.
2. Add two lines to `.env` by hand, never in chat: `EXPO_PUBLIC_SENTRY_DSN=<DSN>` and `EXPO_PUBLIC_APP_ENV=dev`. **Until then the app stops at startup** with a message naming the missing variables. This is deliberate (runbook S03 item 3).
3. `npx expo start --clear`, sign-in, "Component gallery (dev only)": check the fonts, tap "Check connection" (project ref must match atlas-dev in the dashboard), tap "Send test error" (Sentry event must show `segment`, not `name` or `answer`).
4. In your own terminal: `npx supabase login`, then `npx supabase link --project-ref <ref>`. Not done yet. The login stores an access token on this shared computer.

## Blockers

- **BL-5** no Expo account or EAS project. S04 cannot start without it.
- **BL-8** no phone connected. Every "on Phone A" line waits for it.
- **BL-6** `.env` has the atlas-dev URL and key, so it may be cleared once "Check connection" passes. Not confirmed yet.
- **BL-12** `specs/B2-ai-notice.md` and `specs/B3-playful.md` due 26 Nov.
- **BL-11, BL-13** branch and merge questions. Under D-16 anyone on shift may now decide them. Merges stay with Bright.
- Also open: BL-4 icon, BL-7 R2, BL-9 disk (7.9 GB free), BL-10 network.

## Do first next shift

1. Steps 2 and 3 above: finish `.env`, then see the screen. This is the oldest unproven line in the project.
2. Bright merges into `main` in this order: `chore/decision-rights`, `feat/S01-expo-skeleton`, `feat/S02-theme`, `feat/S03-supabase-sentry`. Expect a small conflict in `ops/DECISIONS.md`: keep D-16, D-17 and D-18.
3. Before S04: `npm install-scripts approve @sentry/cli` (npm held back its install script; builds need it for source maps), then S04 once BL-5 is cleared.

## Merge note (D-19)

`feat/S02-theme` has three commits: two from outside the shift (`23017a8`, `ecbb9cd`, already pushed to `origin`) and the session's `fc978ff`. Do not rewrite or force push the branch. When merging S02 into `main` on GitHub, choose **Squash and merge** and use the message from `fc978ff` ("S02: theme, fonts and base components" and its bullet list). Then merge S03 with **Squash and merge** too, so its diff shows only S03 changes.

Something on this computer committed and pushed at 11:38 and 11:59 during the shift (likely the VS Code Source Control button or another session). Find out who before the next build shift. Commits belong at "End shift".

---

## Template for the next rewrite

At "End shift", rewrite this whole file under these headings:

- **Date and shift**
- **Who**
- **Finished**
- **In progress** (branch and next exact step)
- **Blockers**
- **Do first next shift**
