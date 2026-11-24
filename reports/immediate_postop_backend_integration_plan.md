# ADRAB Immediate Post-Operative Backend Integration Plan

**Status:** Architecture/integration guidance for implementation.  
**Clinical status:** The immediate post-operative rubric remains **SURGEON REVIEW PENDING**.  
**Source of truth:** `references/Rubrics/Immediate_PostOp_Maxillofacial_Trauma_Rubric.md` and the user-supplied 9-page PDF.

## 1. Objective

Connect the existing React/Vite frontend to a persistent backend without redesigning or replacing the frontend. Implement reliable case, user, document, imaging-file, and raw-observation workflows. Do not activate clinical scoring, clinical outcome grading, predictive modelling, or model training against the new rubric.

## 2. Repository findings to address

The current `src/services/api.ts` is a browser-side in-memory mock service with artificial delays. It is not a network API client and its data is lost on reload.

The current `runAnalysis()` mock creates random 88-97 scores, confidence intervals, and weighted domain results. These are fabricated demonstration values, not measurements or validated clinical outcomes.

The current Copilot service returns canned, hard-coded clinical claims and numeric examples for general prompts. It must not be presented as evidence-based analysis of a real patient or imaging study.

The Copilot attachment handler currently stores the selected file name in UI state; it does not upload or persist the file contents.

The current Vercel configuration rewrites routes to the SPA entry point. The Python `requirements.txt` does not define an HTTP API server. There is therefore no verified production backend in the repository at this point.

**Implementation requirement:** Preserve the current visual frontend, but progressively replace mock data paths with a real API. Clearly label demo fixtures. Do not allow mock scores, canned clinical statements, or filename-only attachments to masquerade as live backend results.

## 3. Recommended API boundaries

Use versioned REST endpoints with request/response contracts and server-side validation. Exact framework and hosting may be selected to fit the deployment budget; keep storage and service layers separable.

| Capability | Suggested endpoint | Scope now |
|---|---|---|
| Health/status | `GET /api/v1/health` | Live service and dependency status |
| Authentication/session | `POST /api/v1/auth/session`, `DELETE /api/v1/auth/session` | Real identity/session handling; no hard-coded logged-in user |
| Users | `GET/POST /api/v1/users`, `PATCH /api/v1/users/{user_id}` | Role-aware user management |
| Cases | `GET/POST /api/v1/cases`, `GET/PATCH/DELETE /api/v1/cases/{case_id}` | Persistent case administration |
| Case files | `POST /api/v1/cases/{case_id}/files`, `GET /api/v1/cases/{case_id}/files`, `GET /api/v1/files/{file_id}/download` | Actual upload, metadata, private retrieval |
| Rubric reference | `GET /api/v1/rubrics/immediate-postop` | Read-only retrieval of draft rubric and status |
| Raw observations | `POST /api/v1/cases/{case_id}/postop-observations`, `GET /api/v1/cases/{case_id}/postop-observations`, `GET/PATCH /api/v1/postop-observations/{record_id}` | Store and retrieve attributed, non-scoring observations |
| Safety events | `POST /api/v1/cases/{case_id}/safety-events`, `GET /api/v1/cases/{case_id}/safety-events`, `PATCH /api/v1/safety-events/{event_id}` | Record, acknowledge, and audit human-managed flags |
| Knowledge references | `GET /api/v1/knowledge-documents` | Reference metadata and approved access only |

The endpoints are proposed contracts, not claims that these routes already exist.

## 4. Immediate post-op observation data contract

Use `schemas/immediate_postop_observation.schema.json` for the new observation record.

Each observation must retain:
- A stable observation identifier and criterion key/label.
- Evidence type: clinical, radiological, or patient-reported.
- Explicit observation state: recorded, not assessed, not applicable, uncertain, or conflicting.
- Free-text finding and optional value/unit/method.
- For imaging evidence: file reference, modality, view/plane, slice thickness where known, and quality limitations.
- Who recorded/reviewed it and when.

The schema intentionally excludes grade, score, mean, total, overall outcome, pass/fail, and recommendation fields. Keep clinical observations and radiological observations distinct. Do not infer missing findings as normal.

## 5. File intake and storage

- Accept only explicitly supported formats and validate extension, MIME type, size, and actual file signature where feasible.
- Support the required medical image formats only after the imaging pipeline's input contract is confirmed (e.g. DICOM series/archive, NIfTI/NRRD, OPG/X-ray image).
- Store bytes privately; persist metadata and a stable file ID in the database. Do not put patient files in a public Vite asset directory or public Git repository.
- Use authenticated, short-lived file access rather than public URLs.
- Compute a content hash for integrity/deduplication; record uploader, upload time, file size, media type, and case association.
- Never log raw DICOM headers, patient identifiers, uploaded image contents, tokens, or signed URLs.
- Keep raw original files immutable. Store derived/processed outputs separately with tool/version/provenance metadata.

## 6. Frontend integration order

1. Add a typed HTTP client configured by `VITE_API_BASE_URL`; centralize authentication, errors, timeouts, and response parsing.
2. Replace the in-memory case CRUD calls with API calls; keep existing page/layout components intact.
3. Connect user management and knowledge-document retrieval.
4. Implement real file upload and persistent file metadata; make the UI distinguish uploading, uploaded, failed, and unavailable states.
5. Add a **read-only draft rubric** view and non-scoring checklist backed by the rubric reference endpoint.
6. Add raw clinical/radiological observation capture backed by the observation endpoint and schema.
7. Add safety-event recording and acknowledgment with an immutable audit history.
8. Add integration tests for each flow; verify the app still builds and navigates correctly.

## 7. Clinical guardrails that must remain enforced

Until formal surgeon approval is recorded:
- Do not assign Grade 1/2/3, manually or automatically, as an ADRAB outcome.
- Do not derive a rubric grade from CT/CBCT/X-ray data or AI outputs.
- Do not calculate a total, mean, weighted score, percentage, composite outcome, or overall PASS/FAIL.
- Do not train or validate a clinical model using this draft rubric as ground truth.
- Do not generate treatment or revision recommendations from the draft rubric.
- Do not represent the example patient/29-of-30 score in the source PDF as real patient information or validated ground truth.

A red-flag observation should create a traceable safety event for clinician review. It must not be averaged into a score. The source's escalation text is reference material and must not replace local emergency protocols or clinical judgment.

## 8. Existing demo features to quarantine during integration

- Replace or disable the random-score logic in `api.runAnalysis()`; never return fabricated clinical scores as though a real analysis ran.
- Label synthetic case records and mock conversations as demonstrations in all UI locations where they are visible.
- Disable or relabel Copilot prompts that promise rubric scoring, predictive relapse probabilities, treatment recommendations, or analysis of files that were never uploaded.
- Do not show hard-coded clinical findings, confidence percentages, "verified" language, or statements that a scan was analyzed unless those results originate from a real validated service and traceable input.
- A filename-only attachment must not be displayed as an uploaded/analysed image.

## 9. Security, privacy, and audit requirements

- Enforce authentication and role-based authorization on the backend, not just in the UI.
- Use pseudonymous case IDs in APIs and logs wherever feasible; keep direct identifiers separately protected if the use case requires them.
- Audit create/read/update/delete, upload/download, observation changes, safety-event acknowledgment, and access-denied events.
- Use TLS in deployment, secrets in environment/secret storage, strict CORS, request size limits, and rate limiting.
- Define retention, deletion, backup, and recovery policies before real patient data is used.
- Do not claim HIPAA or other regulatory compliance based only on a UI badge or technical setting. Confirm applicable jurisdictional and institutional requirements before deployment with real patient data.

## 10. Acceptance criteria for this phase

- Frontend case and user workflows persist through the real backend and survive reload/re-login.
- Uploaded files are actually stored privately and linked to the correct case.
- Draft rubric can be retrieved and displayed with its pending approval state.
- Raw observations validate against the JSON Schema and retain provenance.
- Not-assessed, not-applicable, uncertain, and conflicting states remain explicit.
- Red-flag events are stored and auditable.
- No endpoint or UI action from this phase returns clinical grades, aggregates, pass/fail results, predictions, or treatment decisions.
- Automated tests prove the non-scoring contract and prevent forbidden score fields.
- Existing frontend appearance is preserved unless a necessary workflow state is missing.

## 11. Surgeon sign-off gate

Before enabling any grade or evaluation logic, obtain and record:
- Approved rubric version and approving surgeon(s).
- Clarified timing, applicability, combined fracture handling, and missing-data rules.
- Resolved Grade 3/2/1 boundaries, including any overlapping measurement cutoffs.
- Decision on whether aggregate scoring is permitted at all; the current source example conflicts with ADRAB's existing no-composite-score guardrail.
- Approved emergency escalation workflow and clinical responsibility.
- Evidence references supporting individual thresholds and measurement methods.

No engineering implementation should infer these decisions.
