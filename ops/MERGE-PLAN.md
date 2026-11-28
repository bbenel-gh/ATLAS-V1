# Merge plan for `main` (for Bright)

Updated 28 November 2026 by Team (Bright, owner). Only Bright merges into `main` (CLAUDE.md).

## Where things stand

- Every session branch now joins one line. `feat/S16b-board-seek` (D-53) was merged into `feat/S19-ai-check` on 28 Nov, so `feat/S19-ai-check` contains S00 to S19, S16b and `chore/decision-rights`.
- `main` exists only on the build computer and holds just `S00: init`. It is an ancestor of `feat/S19-ai-check`, so the merge is a fast-forward with no conflicts.
- GitHub has no `main` yet: its default branch is `feat/S00-repo-files`.
- Do not merge `feat/S14-tooling`: it was shelved by D-40.

## Steps

1. In the main ATLAS-V1 folder, with no uncommitted changes:
   ```
   git checkout main
   git merge --ff-only feat/S19-ai-check
   npm run typecheck
   npm run lint
   npm test
   git push -u origin main
   ```
2. On GitHub, go to Settings, then Branches, and make `main` the default branch.
3. If a later session (S20 onward) is cut from S19, fast-forward `main` to the newest branch the same way.
4. Delete this file once `main` is pushed.

Note on D-19: it advised squash merges on GitHub per branch. A fast-forward keeps the full history instead. Both work.
