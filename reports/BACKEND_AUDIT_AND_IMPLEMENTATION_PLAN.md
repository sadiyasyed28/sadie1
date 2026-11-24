# SADIE / ADRAB — Backend Audit and Implementation Plan

## Current repository state (inspected on 24 November 2026)

The repository is a React 19 + Vite + TypeScript frontend deployed as a static Vercel site. The current `src/services/api.ts` is not a backend: it maintains arrays in browser memory, adds artificial delays, and loses created/updated data on reload. There is no database, real authentication flow, private file storage, or live model API configured in this repository.

The original Copilot and analysis placeholders were unsafe to present as working features:
- The Copilot generated canned replies from keyword checks and supplied fabricated patient findings, measurements, confidence values, risk estimates and source claims.
- The case analysis path generated random scores and domain scores.
- The context panel displayed invented dossier / operative / pathology / quality files.
- The file attachment control only stored the selected file name in frontend state; it did not upload or process the file.

A hardening branch disables the mock clinical evaluator and rubric getters, removes fabricated Copilot responses and sample dossier records, and makes the assistant API fail closed until authentication and a provider are configured.

## Agreed project boundary

**In scope now**
- Authentication and role-aware access.
- Persistent non-clinical case/workspace metadata.
- Conversation history.
- Secure upload and storage of authorised project documents.
- A non-clinical project/research assistant, with server-side model access and clear provenance.
- Logging, input validation, error handling, deletion/retention controls and automated tests.

**Intentionally left empty**
- Postoperative rubric implementation and rubric scoring.
- Clinical evaluation engine and outcome grades.
- Custom ML model training, inference and performance claims.
- Automated CT/X-ray interpretation, measurements or clinical decisions.

These remain disabled until the surgeon has approved the rubric and the separate technical/clinical requirements are agreed.

## Proposed implementation stack (pending project-owner approval)

1. **Vercel Functions** for server-side API routes. The existing Vercel setup currently only serves the SPA; API functions are not yet implemented.
2. **Supabase Auth + Postgres + private Storage** for identities, roles, records, conversations and file metadata. Row-level security must be enabled for every user-facing table. Buckets must remain private; access should use short-lived signed URLs.
3. **Gemini API through a server-side Vercel function** for non-clinical project assistance only. The Gemini key must be a server environment secret; never ship it in frontend JavaScript or a `VITE_*` variable.
4. **Source-grounded retrieval** can be added after authorised source documents are uploaded and indexed. Until then, the assistant must not claim it searched or read the books/papers.

No provider key, Supabase project URL, database, or user authentication configuration is currently available in this repository. The current assistant endpoint intentionally returns HTTP 503 rather than returning simulated answers.

## Data model to implement after platform approval

- `profiles`: authenticated user, role and workspace membership.
- `workspaces`: project / institutional boundary.
- `cases`: minimal case metadata; use pseudonymous identifiers in the prototype.
- `case_files`: private storage object reference, MIME type, size, checksum, uploader and provenance.
- `conversations` and `messages`: user-owned assistant history.
- `audit_events`: security-relevant actions (sign-in, upload, download, delete, role changes).

Do **not** create clinical rubric, evaluation-result, score, model-inference or prediction tables in this phase.

## Security and privacy gates

- Do not upload real patient-identifiable information or clinical scans to the prototype until the institution/surgeon has approved the data handling and applicable ethics/privacy requirements.
- Enforce authentication and workspace-scoped RLS on reads and writes.
- Validate file types, file size and ownership server-side; scan uploads where a suitable service is available.
- Never use public storage buckets for patient material.
- Keep provider keys on the server. Do not log secrets, raw documents or sensitive patient data.
- The non-clinical assistant must clearly state its limits and must not diagnose, grade healing, score a case, interpret scans or invent measurements.

## Next implementation order

1. Owner approves Supabase as the backend platform (or selects another provider).
2. Create the Supabase project, Auth settings, RLS schema and private Storage bucket.
3. Implement sign-in, session handling, protected routes and role checks.
4. Replace in-memory CRUD with authenticated API/database operations.
5. Add document upload and metadata persistence with explicit file status and error handling.
6. Enable a non-clinical Gemini assistant behind authenticated API routes; add source retrieval only from approved/indexed documents.
7. Add integration tests for access control, persistence, upload validation, error paths and conversation history.
8. Only after separate surgeon approval, plan the clinical evaluator and rubric implementation.

## Verification status

This document is a repository audit and implementation plan, not proof of a completed backend. Existing GitHub Actions CI runs lint and Vite build on pull requests to `main`; the new branch must pass those checks before merging. No clinical evaluation, rubric or trained model is enabled by this change.
