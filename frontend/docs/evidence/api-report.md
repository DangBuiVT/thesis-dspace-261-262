# API test

- Timestamp (UTC): 2026-11-17T19:58:26.559Z
- Target: local (thesis_test)
- Total: 53
- Passed: 53
- Failed: 0
- Skipped: 0

| File | Test | Result | Duration |
|---|---|---|---|
| submissions.e2e-spec.ts | TC-SUB-001 creates a reviewing submission with a pending review | passed | 328 ms |
| submissions.e2e-spec.ts | TC-SUB-002 saves a draft then submits it | passed | 230 ms |
| submissions.e2e-spec.ts | TC-SUB-003 rejects a submission without titles | passed | 127 ms |
| submissions.e2e-spec.ts | TC-SUB-004 rejects a submission without an open period | passed | 109 ms |
| submissions.e2e-spec.ts | TC-SUB-005 rejects a submission without reviewers | passed | 149 ms |
| submissions.e2e-spec.ts | TC-SUB-006 forbids submitting as another student | passed | 206 ms |
| submissions.e2e-spec.ts | TC-SUB-007 rejects an anonymous submission | passed | 106 ms |
| submissions.e2e-spec.ts | TC-SUB-008 allows a student to submit another thesis after a previous one | passed | 252 ms |
| submissions.e2e-spec.ts | TC-PDF-001 stores a thesis PDF that the owner can download | passed | 216 ms |
| submissions.e2e-spec.ts | TC-PDF-002 rejects submit when the PDF is missing | passed | 128 ms |
| submissions.e2e-spec.ts | TC-PDF-003 rejects a non-PDF upload | passed | 82 ms |
| submissions.e2e-spec.ts | TC-PDF-004 rejects a PDF larger than the configured limit | passed | 223 ms |
| submissions.e2e-spec.ts | TC-PDF-005 accepts a PDF filename with spaces and unicode | passed | 229 ms |
| submissions.e2e-spec.ts | TC-PDF-006 enforces download permissions | passed | 591 ms |
| submissions.e2e-spec.ts | TC-PDF-007 keeps the existing PDF when resubmitting without a new file | passed | 604 ms |
| submissions.e2e-spec.ts | TC-RES-001 resubmits after reviewer rejection and resets the review | passed | 476 ms |
| submissions.e2e-spec.ts | TC-RES-002 resubmits after library rejection | passed | 406 ms |
| submissions.e2e-spec.ts | TC-RES-003 resubmits an approved thesis before archive | passed | 457 ms |
| submissions.e2e-spec.ts | TC-RES-004 refuses resubmit after archive | passed | 1072 ms |
| submissions.e2e-spec.ts | TC-RES-005 refuses another submit while a reviewer has already decided | passed | 262 ms |
| form-schema.e2e-spec.ts | exposes the original 17 questions in two ordered sections | passed | 108 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for email on the server | passed | 386 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for submissionAttempt on the server | passed | 308 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for components on the server | passed | 310 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for titleVi on the server | passed | 326 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for titleEn on the server | passed | 404 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for authorIds on the server | passed | 411 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for thesisAdvisors on the server | passed | 407 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for advisor2 on the server | passed | 431 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for reviewer1 on the server | passed | 333 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for reviewer2 on the server | passed | 303 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for reviewer3 on the server | passed | 277 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for reviewer4 on the server | passed | 318 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for reviewer5 on the server | passed | 305 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for major on the server | passed | 271 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for thesisYear on the server | passed | 286 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for archiveFacultyId on the server | passed | 346 ms |
| form-schema.e2e-spec.ts | enforces mandatory/optional/hidden for thesisFile on the server | passed | 265 ms |
| form-schema.e2e-spec.ts | saves partial checklists as drafts, rejects incomplete submission and keeps saved answers | passed | 231 ms |
| form-schema.e2e-spec.ts | preserves the current admin other faculty override and review-step controls | passed | 162 ms |
| form-schema.e2e-spec.ts | preserves the current admin existing faculty override and review-step controls | passed | 170 ms |
| form-schema.e2e-spec.ts | rejects unknown and malformed checkbox answers | passed | 111 ms |
| form-schema.e2e-spec.ts | keeps admin modes and existing answers after reapplying the migration | passed | 45 ms |
| form-schema.e2e-spec.ts | allows PDF preview for all five roles and denies unrelated users | passed | 704 ms |
| workflow-ui.e2e-spec.ts | persists partial metadata, synchronizes title, and preserves the separate description | passed | 332 ms |
| workflow-ui.e2e-spec.ts | rejects editing before Editor and after forwarding to Final Editor | passed | 211 ms |
| workflow-ui.e2e-spec.ts | rejects invalid metadata and preserves stored values | passed | 206 ms |
| workflow-ui.e2e-spec.ts | does not fabricate a metadata event for a no-op | passed | 222 ms |
| workflow-ui.e2e-spec.ts | denies metadata changes from students and reviewers | passed | 207 ms |
| workflow-ui.e2e-spec.ts | protects history from unrelated students and reviewers | passed | 387 ms |
| workflow-ui.e2e-spec.ts | returns to Editor, preserves academic approval/files, then forwards and archives | passed | 709 ms |
| workflow-ui.e2e-spec.ts | requires a return reason and disallows director rejection | passed | 318 ms |
| workflow-ui.e2e-spec.ts | blocks return actions at earlier stages and a stale duplicate return | passed | 457 ms |
