## Contract: Push SpacePulse to GitHub

**Created**: 2026-03-30
**Status**: In progress

### Goal
Initialize git (if needed) and push this workspace to the target GitHub repository.

### Success criteria
- [ ] A git repository exists at workspace root (`git status` works).
- [ ] No secrets are committed (notably `.env.local`, `.env`, `*.pem`, and `node_modules/` are excluded via `.gitignore`).
- [ ] An initial commit exists on the default branch.
- [ ] A GitHub remote `origin` is configured to the user-provided repo.
- [ ] `git push -u origin <default-branch>` succeeds.

### Non-goals
- Setting up CI/CD, branch protection, or GitHub Actions.
- Creating additional branches, tags, or releases.

### Verification
- Run: `git status`
- Run: `git remote -v`
- Run: `git log --oneline -n 5`
- Confirm: `git push` reports success and upstream tracking is set.

