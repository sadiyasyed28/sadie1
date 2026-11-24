# ADRAB backend foundation

## Status

This is the first backend infrastructure increment. It defines the database and access-control foundation for persistent case administration, private imaging-file metadata, attributed raw post-operative observations, safety-event tracking, audit events, and conversation history.

**Not implemented or enabled:** clinical scoring, rubric grading, aggregate outcomes, pass/fail decisions, treatment recommendations, clinical prediction, medical-image interpretation, or model training. The current rubric remains outside this operational data layer until the surgeon approves it.

## Chosen backend

Supabase is the proposed low-cost managed backend for:
- PostgreSQL persistence
- Authenticated user sessions
- Row-level security (RLS)
- Private object storage for case files

The schema is in `supabase/migrations/202611240001_initial_backend.sql`.

## Setup

1. Create a Supabase project in the appropriate region for the institution and data-governance requirements.
2. Open the SQL Editor and run the migration.
3. Keep the `case-files` bucket private.
4. Configure these values in local `.env.local` and the Vercel project:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL` (server-side health check)
   - `SUPABASE_ANON_KEY` (server-side health check)
5. Never place a Supabase service-role key in a `VITE_*` variable or browser bundle.
6. Complete the auth UI, API client, and per-feature integration before entering real patient data.

The repository currently has no authenticated login flow. Therefore, this migration alone does not make the app production-ready for patient information. Do not add real patient identifiers, scans, or clinical records until authentication, authorization, private uploads, audit behavior, backup/retention, and institutional approval have been verified.

## Data model

- `profiles`: authenticated account profile and role label.
- `cases`: pseudonymous case-level metadata.
- `case_members`: case-level read/write membership; membership changes must be managed by a trusted administrative path.
- `case_files`: private object metadata and integrity hash.
- `postop_observations`: raw, attributed observations only, with explicit not-assessed/not-applicable/uncertain/conflicting states.
- `safety_events`: open/acknowledged/closed events with attribution.
- `copilot_conversations` and `copilot_messages`: chat history; source references are retained separately.
- `knowledge_documents`: source metadata and an explicit AI-context approval flag.
- `audit_events`: append-only event records.

## Next implementation step

Wire Supabase Auth into the React app, add a protected route/session layer, then replace the browser-only mock methods in `src/services/api.ts` with authenticated database/storage operations. The integration must be tested with two separate accounts to prove case-level isolation and with private-file download checks. The current frontend's demo data and canned AI/analysis responses must not be treated as live records.
