# PREPMIND AI — AGENT OPERATING INSTRUCTIONS

## 1. Resume Instructions
Before making any changes or performing audits in this repository:

1. **Read the dated handoff document first:**
   - Review [`docs/PREPMIND_HANDOFF_2026-10-12.md`](file:///d:/PrepMind/docs/PREPMIND_HANDOFF_2026-10-12.md) to understand current architecture, completed work, and known blockers.
2. **Inspect repository state:**
   - Run `git status --short --branch` and inspect existing diffs before modifying anything.
   - Verified current HEAD is `39aa164`.
3. **Continue from the documented next step:**
   - Do NOT restart or repeat completed repository audits, cleanups, or unit implementations.
   - Follow the **Next-Session Plan** outlined in Section 6 of the handoff:
     - Step 1: Recover state and preserve working files.
     - Step 2: Review and apply Supabase migration [`supabase/migrations/20261012010000_private_notebooks_schema.sql`](file:///d:/PrepMind/supabase/migrations/20261012010000_private_notebooks_schema.sql) only after explicit user approval.
     - Step 3: Perform live end-to-end integration testing with real PDF and cloud credentials.
     - Step 4: Final release review, test execution, and deployment only upon user authorization.
4. **Preserve existing modifications:**
   - Do NOT reset, stash, revert, overwrite, or discard uncommitted changes.
   - Maintain protected boundaries for:
     - `app/src/api.ts`
     - `app/src/pages/Chat.tsx`
     - `app/src/pages/Home.tsx`
     - `app/src/pages/Practice.tsx`
     - `app/src/pages/StudyMaterials.tsx`
5. **Truth in verification:**
   - Never claim unverified production behavior or live database operations as successful unless backed by live verification evidence.
   - Clearly distinguish between locally simulated tests and live cloud deployments.
   - Do NOT commit, push, deploy, or apply migrations without explicit user authorization.
