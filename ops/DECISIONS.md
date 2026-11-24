# Decisions

One line per decision. Newest first. A decision here is settled. To change one,
add a new entry that says what it replaces and why.

Since D-16, whoever is on shift may make a decision that was marked for Bright.
Write their name, role and the date in the "Who" column. Every merge into
`main`, and every change to `CLAUDE.md`, `specs/` or the final
`content/materials.json`, still needs Bright.

| ID | Date | Decision | Who | Why |
| --- | --- | --- | --- | --- |
| D-24 | 24 Nov 2026 | V1 is the main product, not only a pilot: public APK link, self sign-up built in full behind an admin switch that stays off until the data protection consultant confirms cover, in-app guardian consent alongside paper forms, admins manage pupils, pupils state their school, `schools` table built now for future use, global daily AI cap plus sign-ups per phone per day. `CLAUDE.md` (both copies), `specs/prd.md` and `specs/data-model.md` amended. Microphone stays off (D-22) | Bright (owner), S05 | Bright: V1 stays in use for one to two months and must be open to pupils beyond the pilot. Public Play Store listing still needs the 14-day closed test, so V1 ships by APK link first. The sign-up switch follows the existing rule that the pilot waits for the consultant (prd section 10) |
| D-23 | 24 Nov 2026 | Keep `extra.router.asyncRoutes.web: true` in `app.json` for now. Review it in B10 (web dashboard) | Bright (owner), S04 | It appeared in `app.json` from outside the session. No spec asks for it, but on-demand screen loading may help the admin web export. B10 decides whether it stays |
| D-22 | 24 Nov 2026 | No microphone and no background playback in V1. `expo-audio` is set to `microphonePermission: false`, `recordAudioAndroid: false`, background playback and recording off; `expo-video` background and picture-in-picture off; `RECORD_AUDIO`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` and `FOREGROUND_SERVICE_MICROPHONE` are in `android.blockedPermissions`. Voice returns only together with the consent and data protection work in `specs/framework.md` line 210 | Bright (owner), S04 | `specs/prd.md` line 268 puts voice input out of scope, `framework.md` line 119 says "V1: no voice", `video-board.md` P6 pauses video in the background. `expo-audio` adds these permissions by default, and a full `permissions` list had appeared in `app.json` from outside the session. Checked in a throwaway prebuild: the manifest removes all three. `MODIFY_AUDIO_SETTINGS` stays, a normal permission `expo-audio` needs for playback, with no microphone access |
| D-21 | 24 Nov 2026 | EAS builds set `SENTRY_DISABLE_AUTO_UPLOAD=true` in every profile until a Sentry auth token is stored as an EAS secret | Bright (owner), S04 | Without a token the Sentry plugin's source map upload can fail the whole build. Cost: stack traces from builds are minified until upload is turned on |
| D-20 | 24 Nov 2026 | Android id `com.atlas.learn` confirmed. Version lives in `app.json` (`appVersionSource: local`), bumped only with `npm run version:bump`; versionCode goes up by 1 on every bump | Bright (owner), S04 | Confirms D-14 before the first APK reaches a phone. Runbook S04 item 4 asks for a local bump script, which needs the local version source |
| D-19 | 24 Nov 2026 | `feat/S02-theme` keeps its three commits (`23017a8`, `ecbb9cd`, `fc978ff`). They are squashed into one only when S02 merges into `main`, with GitHub "Squash and merge" and the S02 message from `fc978ff`. S03 is merged the same way after it | Bright (owner) | `23017a8` and `ecbb9cd` were committed and pushed to `origin` at 11:38 and 11:59 by something outside the shift, not by the session. Squashing the branch would need a force push over a published branch. Squashing at merge gives `main` one clean S02 commit with no history rewrite. Source of the outside commits not yet found |
| D-18 | 24 Nov 2026 | The Sentry scrubber removes `name`, `pin`, `code`, `answer` and `reason` at any depth, except inside Sentry's `sdk`, `contexts.os`, `contexts.runtime` and `contexts.browser` blocks | Bright (owner), S03 | Sentry's event format needs `sdk.name`, and those blocks hold no pupil data. `contexts.device.name` is still removed because phones are often named after their owner. Free text in error messages is not scanned, so code must never put pupil words into an Error |
| D-17 | 24 Nov 2026 | The S03 health check calls `<url>/auth/v1/health` with the anon key, not `supabase.auth.getSession()` | Bright (owner), S03 | With nobody signed in, `getSession()` only reads local storage, so it would report "Connected" with a wrong URL or no network |
| D-16 | 24 Nov 2026 | Any decision marked for Bright may be made by whoever is on shift, recorded here with name, role and date. Changes to `CLAUDE.md`, `specs/`, the final `content/materials.json`, and merges into `main`, stay with Bright. `CLAUDE.md` updated to match (version 24 November 2026) | Bright (owner), given in chat on the shared account during the 24 Nov S02 shift | Decisions were queuing on one person. Bright chose option A, decisions only, over opening up the source-of-truth files as well |
| D-15 | 23 Nov 2026 | Spacing scale is 4, 8, 12, 16, 24, 32, with no 48 step | Build operator | The runbook S02 lists the scale exactly. `CLAUDE.md` does not define one, so the runbook is the only authority. A 48 step written earlier was removed and a test now guards the scale |
| D-14 | 23 Nov 2026 | Android application id is `com.atlas.learn`. **Supersedes D-13** | Build operator | The runbook S01 item 8 names `com.atlas.learn`. D-13 invented an id because the runbook had not been read yet. The runbook wins, and the id cannot change after a Play Store publish, so it was corrected before the first commit |
| ~~D-13~~ | ~~23 Nov 2026~~ | ~~Android application id is `com.atlasghana.atlas`~~ | Build operator | **Superseded by D-14.** Taken before the runbook was in the repo |
| D-12 | 23 Nov 2026 | Lesson routes live in `app/` at the repo root, not `src/app/` | Build operator | CLAUDE.md folder layout says `app/`. The Expo SDK 58 template uses `src/app/`, which takes precedence when both exist, so `src/app/` was deleted |
| D-11 | 23 Nov 2026 | Web export is `single`, set explicitly in `app.json` | Build operator | Expo SDK 58 changed the Expo Router default to `server`. The admin and teacher dashboard is a static web export, so the default had to be overridden |
| D-10 | 23 Nov 2026 | Node 24.22.3 LTS, unpacked from the official zip to `C:\ATLAS\tools` | Build operator | Node was not installed on the shared computer. Expo SDK 58 accepts 22.13+, 24.3+ or 26+. Node 26 became LTS in October 2026 and native build tooling does not all have prebuilds for it yet. Node 24 is LTS, supported, and mature. The zip needs no admin rights and is reversible |
| D-9 | 23 Nov 2026 | The repo lives in `MOBILE-APP\ATLAS-V1` | Bright | It already held the ATLAS documents and no code. The `School Administration` folder holds the report card repo, which is a separate product per D-6 |
| D-8 | 23 Nov 2026 | Build a working app with placeholder content first; real lessons replace placeholders later | Bright | The build and the content are made by different people on different dates. Waiting for signed-off content would leave the build sessions idle until 27 November |
| D-7 | 22 Nov 2026 | Conflicts between the older ATLAS documents settled | Bright | Recorded in `DOCS_INDEX.md`, "Conflicts settled in this rewrite" |
| D-6 | 23 Nov 2026 | The report card system (ATLAS Admin) is not in V1 | Bright | Separate product with its own plan. Revisit after 18 December |
| D-5 | 23 Nov 2026 | Budget ceiling and pilot class size | Bright | See `ATLAS_V1_BUILD_PLAN.md` section 9 |
| D-4 | 23 Nov 2026 | Bright acts on safeguarding alerts the same day, with a named backup at the school | Bright | A safeguarding flag cannot wait for a shift rota |
| D-3 | 23 Nov 2026 | Play Store closed test from 1 December is optional | Bright | Not needed for the pilot. Start only if 15 or more testers are ready |
| D-2 | 23 Nov 2026 | V1 topic is Materials (Basic 7 Integrated Science), not Mathematics | Bright | The framework was designed on it, and it avoids handwritten maths notation in V1 |
| D-1 | 23 Nov 2026 | Keep shift 3 for building until 7 December | Bright | 17 sessions must fit in about 6 days after 2 December. One build shift a day is not enough |

## Notes on the entries above

D-1 to D-7 are carried over from `ATLAS_V1_BUILD_PLAN.md` sections 4 and 9 and
from `DOCS_INDEX.md`, so this file is the single place to read them. The build
plan recorded recommendations; if Bright settled any of D-1 to D-6 differently
on 23 November, correct the row and say so.

D-10 to D-13 were taken by the build operator inside session S00 because the
session could not finish without them. Each one is reversible. Bright should
confirm or overturn D-13 before the first Play Store step.
