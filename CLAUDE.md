# Nightpulse (Vybi)

## Git workflow: staging before main — no exceptions by default

`main` is what real users experience. **Never push a new update, enhancement, or
feature straight to `main`.** Doing so risks disrupting people's live session on
the app.

Required flow for any new work:
1. Develop on a feature branch (e.g. `claude/...`).
2. Push/merge the feature branch into `staging` first.
3. Stop and let the user test on staging before going further.
4. Only merge `staging` → `main` once the user explicitly confirms it's good to
   go live.

This is a standing rule — it applies across sessions, not just the one that
set it. Don't merge to `main` on your own initiative even if a change looks
small or safe; always land on `staging` first and wait for the user's
go-ahead before promoting to `main`. If the user explicitly asks for
something to go straight to `main` in a specific instance, that one-off
request is fine to honor, but it doesn't change the default — go back to
staging-first for the next change.
