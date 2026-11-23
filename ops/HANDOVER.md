# Handover

Rewritten at the end of every shift. The next person reads this first, then
`ops/STATUS.md`.

---

**Shift**: 23 November 2026, shift 2
**Person and role**: Build operator, name not given
**Session**: the repo setup task, carried over from shift 1
**Branch**: `feat/S00-setup`, one commit, clean, not pushed
**State**: Work complete except one check. "End shift" has not been run.

## Correction carried from shift 1

Shift 1 wrote this file and `ops/STATUS.md` from its plan rather than from
results. They claimed the packages were installed, the work was committed, and
that typecheck, lint and test had been run. None of it was true at the time.
Everything below has been checked, and each line says how.

## What is done

- Node 24.22.3 LTS, SHA-256 verified, unpacked to `C:\ATLAS\tools`, added to the user PATH. Node was not on this computer before shift 1. A new terminal will have `node` and `npx` on PATH.
- Expo SDK 58.0.26 app, React Native 0.88.1, React 19.3.0, TypeScript 6.0.3 strict.
- Expo Router with routes in `app/` at the root. No template screen, component, hook or image is in the repo.
- All 21 required packages installed and verified on disk.
- `src/theme.ts` with every CLAUDE.md token, and 14 tests guarding them.
- `ops/` complete. The 23 Nov placeholder-content decision is D-8.
- Typecheck, lint and test all pass. Android and web both bundle.
- Committed: `9c2791f S00: init` on `main`, then `725c451` on `feat/S00-setup`, 41 files.

## The one thing not proven

**Nobody has seen the screen.** It compiles for both platforms, the font files
are in the export, and the dev server returns HTTP 200 with the ATLAS title on
both `localhost` and `192.168.0.174`. But no browser and no phone has rendered
it. Do not tick S00 until someone does this:

```
cd c:\Users\Grace\Desktop\MOBILE-APP\ATLAS-V1
npx expo start
```

Then press `w` for the browser, and scan the QR with Expo Go on the phone, or
type `exp://192.168.0.174:8081`. Expect the word ATLAS in a serif face, dark
navy on near-white. If the letters look like the system sans, the fonts did not
load and that is a real bug.

A dev server may still be running on port 8081 from this shift. Stop it first,
or use `--port 8082`.

## Open blockers

`ops/BLOCKERS.md` has 11. The ones that matter now:

- **BL-1 and BL-2**: `specs/` is empty, and `specs/data-model.md`, `ai-prompts.md` and `B0.md` to `B12.md` do not exist anywhere on this computer. S05 onward cannot start. Only Bright may write `specs/`.
- **BL-11**: this work maps onto runbook S01 and S02, not S00, and sits on `feat/S00-setup`. The runbook wants one session per branch, and says S00 is run by Bright. Bright decides whether to accept or split it.
- **BL-5**: no Expo account or EAS project, so the B0 "Done when", a build installing on both phones from a link, cannot be reached.
- **BL-9**: disk. 8.81 GB free now, but `ENOSPC` already killed one install and a Gradle cache is several GB.
- **BL-10**: the network drops mid download. Three `ECONNRESET` failures, one of which rolled back packages that `package.json` still listed. If it happens again, pin every version first and run a single `npm install`.
- Also open: BL-3 `content-work/`, BL-4 no app icon, BL-6 no `atlas-dev` Supabase project, BL-7 no R2 bucket, BL-8 no phone connected.

## Decisions for Bright to confirm

D-10 to D-15 in `ops/DECISIONS.md`. Two worth a look:

- **D-14**: the Android application id is now `com.atlas.learn`, taken from runbook S01 item 8. It replaces D-13, which invented `com.atlasghana.atlas` before the runbook was in the repo. Confirm it, because the id cannot change after a Play Store publish.
- **D-10**: Node 24 rather than the newest Node 26. Expo SDK 58 accepts 22.13+, 24.3+ or 26+, and Node 26 became LTS only last month.

## Note on git authorship

The commit is authored by `ATLAS build operator <build-operator@atlas.local>`,
set **locally** in this repo only. This computer is shared and the person on
shift did not give a name, and committing under the owner's email would have
misattributed the work. To correct it:

```
git config user.name "<your name>"
git config user.email "<your email>"
git commit --amend --reset-author --no-edit
```

## What the next shift should do first

1. Prove or fail the screen, in the browser and on a phone. Write the result in the shift log.
2. Get Bright's answer on BL-11 before opening a pull request, so the branch is not merged under the wrong session number.
3. Close the S01 and S02 gap list in `ops/STATUS.md`, starting with the `src/domain` import rule, because CLAUDE.md requires it and every later session depends on `src/domain` staying pure.
