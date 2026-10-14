# Project instructions

## Project and remote

- Project name: **3D Warehouse Dashboard**; the application is branded **WareTrack**.
- Repository: `https://github.com/kengcc/3D-Warehouse-Dashboard`.
- Preserve the existing TypeScript data model and seed files unless the user explicitly asks to change them.
- Keep business logic, KPI calculations, filters, and telemetry transitions in the store/application layer. Keep scene components focused on presentation and camera interactions.

## Verification

- Run `npm test` and `npm run build` for code changes.
- Verify user-facing interaction or layout changes in a browser when available.
- Keep KPI definitions and simulation limitations accurate in the README.

## Commit and push

The user explicitly requested that future code changes in this project be committed and pushed to this GitHub repository.

- After completing requested changes and relevant checks, commit the task's changes with a descriptive message and push the current branch to its configured upstream.
- For a branch without an upstream, push it to `origin` and set its upstream.
- Respect a later request to keep changes local or not commit/push.
- Inspect working changes first; do not include unrelated pre-existing changes in a task commit.
- Do not force-push, rewrite shared history, or commit secrets, local dependencies, or generated build output.
- If authentication, remote branch changes, or permissions block the push, preserve the local work and report the exact blocker. Do not overwrite remote work to bypass it.
