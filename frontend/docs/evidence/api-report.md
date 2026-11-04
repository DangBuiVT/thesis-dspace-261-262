# API test

- Timestamp (UTC): 2026-11-04T13:16:36.854Z
- Target: http://127.0.0.1:3001
- Total: 51
- Passed: 51
- Failed: 0
- Skipped: 0

| File | Test | Result | Duration |
|---|---|---|---|
| reviews.e2e-spec.ts | TC-REV-001 shows only submissions assigned to the reviewer | passed | 451 ms |
| reviews.e2e-spec.ts | TC-REV-002 keeps status reviewing and opens the library queue after the only reviewer approves | passed | 215 ms |
| reviews.e2e-spec.ts | TC-REV-003 waits for every reviewer before library intake | passed | 328 ms |
| reviews.e2e-spec.ts | TC-REV-004 requires a comment when a reviewer rejects | passed | 166 ms |
| reviews.e2e-spec.ts | TC-REV-005 stores the reject reason and leaves the library queue | passed | 171 ms |
| reviews.e2e-spec.ts | TC-REV-006 blocks a reviewer who is not assigned | passed | 182 ms |
| reviews.e2e-spec.ts | TC-REV-007 blocks a second decision | passed | 371 ms |
| reviews.e2e-spec.ts | TC-REV-008 forbids students and library staff from reviewer actions | passed | 130 ms |
| reviews.e2e-spec.ts | TC-LIB-001 approves intake and shows the thesis to the director | passed | 212 ms |
| reviews.e2e-spec.ts | TC-LIB-002 rejects intake and stores the reason | passed | 175 ms |
| reviews.e2e-spec.ts | TC-LIB-003 requires a library reject comment | passed | 147 ms |
| reviews.e2e-spec.ts | TC-LIB-004 refuses intake while a reviewer is still pending | passed | 156 ms |
| reviews.e2e-spec.ts | TC-LIB-005 refuses archive from library staff | passed | 110 ms |
| reviews.e2e-spec.ts | TC-DIR-001 archives an approved thesis without publishing immediately | passed | 168 ms |
| reviews.e2e-spec.ts | TC-DIR-002 lets the director return an approved thesis to Editor | passed | 174 ms |
| reviews.e2e-spec.ts | TC-DIR-003 refuses archive unless the thesis is at the director step | passed | 118 ms |
| reviews.e2e-spec.ts | TC-DIR-004 forbids reviewer and library staff from director actions | passed | 95 ms |
| submissions.e2e-spec.ts | TC-SUB-001 creates a reviewing submission with a pending review | passed | 207 ms |
| submissions.e2e-spec.ts | TC-SUB-002 saves a draft then submits it | passed | 188 ms |
| submissions.e2e-spec.ts | TC-SUB-003 rejects a submission without titles | passed | 52 ms |
| submissions.e2e-spec.ts | TC-SUB-004 rejects a submission without an open period | passed | 94 ms |
| submissions.e2e-spec.ts | TC-SUB-005 rejects a submission without reviewers | passed | 80 ms |
| submissions.e2e-spec.ts | TC-SUB-006 forbids submitting as another student | passed | 88 ms |
| submissions.e2e-spec.ts | TC-SUB-007 rejects an anonymous submission | passed | 59 ms |
| submissions.e2e-spec.ts | TC-SUB-008 allows only one non-draft thesis per student | passed | 195 ms |
| submissions.e2e-spec.ts | TC-PDF-001 stores a thesis PDF that the owner can download | passed | 151 ms |
| submissions.e2e-spec.ts | TC-PDF-002 rejects submit when the PDF is missing | passed | 56 ms |
| submissions.e2e-spec.ts | TC-PDF-003 rejects a non-PDF upload | passed | 90 ms |
| submissions.e2e-spec.ts | TC-PDF-004 rejects a PDF larger than the configured limit | passed | 256 ms |
| submissions.e2e-spec.ts | TC-PDF-005 accepts a PDF filename with spaces and unicode | passed | 151 ms |
| submissions.e2e-spec.ts | TC-PDF-006 enforces download permissions | passed | 327 ms |
| submissions.e2e-spec.ts | TC-PDF-007 keeps the existing PDF when resubmitting without a new file | passed | 295 ms |
| submissions.e2e-spec.ts | TC-RES-001 resubmits after reviewer rejection and resets the review | passed | 279 ms |
| submissions.e2e-spec.ts | TC-RES-002 resubmits after library rejection | passed | 285 ms |
| submissions.e2e-spec.ts | TC-RES-003 resubmits an approved thesis before archive | passed | 318 ms |
| submissions.e2e-spec.ts | TC-RES-004 refuses resubmit after archive | passed | 240 ms |
| submissions.e2e-spec.ts | TC-RES-005 refuses another submit while a reviewer has already decided | passed | 202 ms |
| workflow-ui.e2e-spec.ts | persists partial metadata, synchronizes title, and preserves the separate description | passed | 200 ms |
| workflow-ui.e2e-spec.ts | rejects editing before Editor and after forwarding to Final Editor | passed | 188 ms |
| workflow-ui.e2e-spec.ts | rejects invalid metadata and preserves stored values | passed | 188 ms |
| workflow-ui.e2e-spec.ts | does not fabricate a metadata event for a no-op | passed | 195 ms |
| workflow-ui.e2e-spec.ts | denies metadata changes from students and reviewers | passed | 144 ms |
| workflow-ui.e2e-spec.ts | protects history from unrelated students and reviewers | passed | 229 ms |
| workflow-ui.e2e-spec.ts | returns to Editor, preserves academic approval/files, then forwards and archives | passed | 325 ms |
| workflow-ui.e2e-spec.ts | requires a return reason and disallows director rejection | passed | 213 ms |
| workflow-ui.e2e-spec.ts | blocks return actions at earlier stages and a stale duplicate return | passed | 235 ms |
| dspace-publish.e2e-spec.ts | TC-DSP-001 archives in the portal before any publish call | passed | 188 ms |
| dspace-publish.e2e-spec.ts | TC-DSP-002 rejects publish without a collection or submissions | passed | 173 ms |
| dspace-publish.e2e-spec.ts | TC-DSP-003 skips publish for a thesis that is still reviewing | passed | 133 ms |
| dspace-publish.e2e-spec.ts | TC-DSP-004 forbids students and reviewers from publishing | passed | 171 ms |
| dspace-publish.e2e-spec.ts | TC-DSP-005 keeps the archived thesis when DSpace is missing or fails | passed | 225 ms |
