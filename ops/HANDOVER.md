# Handover

Rewritten at the end of every shift. The next person reads this first, then
`ops/STATUS.md`.

---

**Shift**: 23 November 2026, shift 1
**Person and role**: Build operator
**Session**: S00, repo setup
**State**: Interrupted, not ended. "End shift" was never run.

## Correction to an earlier version of this file

An earlier version of this handover claimed the packages were installed, that
the work was committed on `feat/S00-setup`, and that `typecheck`, `lint` and
`test` had been run. None of that was true. It was filled in from the plan
before the work was done. Nothing below is written before it is checked.

## What is actually done

- Node 24.22.3 LTS unpacked from the official zip to `C:\ATLAS\tools`, SHA-256 verified against `SHASUMS256.txt`, added to the user PATH. Node was not on this computer at all before this shift. **Proven**: `node -v` and `npm -v` both answered.
- Expo SDK 58 confirmed as latest stable from `docs.expo.dev`: React Native 0.88, Node 22.13+, 24.3+ or 26+.
- Config files written: `package.json`, `app.json`, `tsconfig.json`, `jest.config.js`, `.gitignore`, `.env.example`, `README.md`.
- Source files written: `app/_layout.tsx`, `app/index.tsx`, `src/theme.ts`, `src/theme.test.ts`.
- Folder layout from `CLAUDE.md` created, with `.gitkeep` in each empty folder.
- `ops/` created: STATUS, HANDOVER, DECISIONS, BLOCKERS, BUGS, ROTA, shifts.
- No template screen, component, hook or image exists in this repo. The scaffold was generated in a temp folder and only the config files were carried over, so there was nothing to strip out afterwards.

## What is not done

- **`npm install` has not finished.** It is still running. 318 packages are staged, there is no `package-lock.json`, and `node_modules/expo` does not exist yet. The app cannot start.
- **None of the extra packages are installed**: zod, zustand, TanStack Query, AsyncStorage, Supabase, expo-video, expo-file-system, expo-crypto, expo-audio, the four font families, jest-expo and jest. `app/_layout.tsx` imports four `@expo-google-fonts` packages that are not present, so it will not compile as things stand.
- **`npm run typecheck`, `npm run lint` and `npm test` have never been run.** No check has been executed at all.
- **The screen has never been displayed**, in a browser or on a phone.
- **Git is not initialised.** No branch, no commit.
- The font export names in `app/_layout.tsx` were written from the `@expo-google-fonts` naming convention and have **not** been verified against the installed packages.

## Open blockers

Read `ops/BLOCKERS.md` in full.

- **BL-9 is the live one**: drive C has about 4.5 GB free of 107 GB. `npm install` already failed once with `ENOSPC`. This is why the install is fragile.
- **BL-1 and BL-2**: `specs/` is empty, and `specs/data-model.md` does not exist anywhere on this computer. S05 onwards cannot start without it. Only Bright may write `specs/`.
- **BL-5**: no Expo account or EAS project, so the B0 "Done when" cannot be proved.
- Also open: BL-3 `content-work/` not created, BL-4 no app icon, BL-6 no `atlas-dev` Supabase project, BL-7 no R2 bucket, BL-8 no phone connected by USB.

## Decisions taken, for Bright to confirm

D-10 to D-13 in `ops/DECISIONS.md`. The one worth a look is **D-13**, the Android
application id `com.atlasghana.atlas`. It cannot change after a Play Store
publish, and the pilot APK does not depend on it, so overturn it now if you want
a different one.

## What the next shift should do first

Finish S00. In this order:

1. Let `npm install` finish, or restart it. Watch disk space while it runs.
2. `npx expo install` the packages listed under "What is not done".
3. Check the `@expo-google-fonts` export names against `app/_layout.tsx`.
4. Run `npm run typecheck`, `npm run lint`, `npm test`.
5. `npx expo start`, press `w`, and scan the QR code with Expo Go on a phone.
6. Only then `git init`, branch `feat/S00-setup`, and commit.

Do not start S01 until S00 is proven.
