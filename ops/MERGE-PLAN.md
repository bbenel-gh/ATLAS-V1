# Merge plan for `main` (for Bright)

Written 28 November 2026 by Team (Bright, owner). Only Bright merges into `main` (CLAUDE.md).

## Where things stand

- `main` exists only on the build computer and holds just `S00: init`. GitHub has no `main` yet: its default branch is `feat/S00-repo-files`.
- The sessions form one line. Each branch was cut from the one before, so `feat/S19-ai-check` contains S00 to S18 and `chore/decision-rights`. `main` is an ancestor of it, so this is a fast-forward.
- Not in that line:
  - `feat/S16b-board-seek`: seek by gesture (D-52). Merge it.
  - `feat/S14-tooling`: shelved by D-40. Do not merge it.

## Steps

1. Wait until S19 is finished, committed and pushed.
2. In the main ATLAS-V1 folder, with no uncommitted changes:
   ```
   git checkout main
   git merge --ff-only feat/S19-ai-check
   git merge feat/S16b-board-seek
   ```
3. A trial merge (28 Nov, S19 at that time) gave conflicts only in three notes files. The code merges cleanly. Fix each file like this, then `git add` it and `git commit`:
   - `ops/DECISIONS.md`: keep every row, newest first (D-52, D-51, then the rest).
   - `ops/STATUS.md`: keep the newest session under "Current session". Move the S16b paragraph under "Earlier".
   - `ops/shifts/2026-11-28-1-team.md`: keep both sides.
   If S19 changes after 28 Nov, other files may conflict too. Run `git status` to see them.
4. Run `npm run typecheck`, `npm run lint` and `npm test`. All three must pass.
5. Run `git push -u origin main`. Then, on GitHub, go to Settings, then Branches, and make `main` the default branch.
6. Delete this file in a follow-up commit once `main` is pushed.

Note on D-19: it advised squash merges on GitHub per branch, because of two outside commits on S02. A fast-forward keeps the full history instead. Both work. Choose squash only if you want one commit per session on `main`.
