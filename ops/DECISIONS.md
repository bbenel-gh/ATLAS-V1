# Decisions

One line per decision. Newest first. A decision here is settled. To change one,
add a new entry that says what it replaces and why.

Anything that reaches pupils, every merge into `main`, and every change to
`CLAUDE.md` or `specs/` needs Bright.

| ID | Date | Decision | Who | Why |
| --- | --- | --- | --- | --- |
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
