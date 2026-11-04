# Validation and evidence

Evidence date: **4 November 2026**, Asia/Ho_Chi_Minh. Test reports contain UTC timestamps for reproducibility. Target: local Windows checkout, isolated PostgreSQL 16, local NestJS/Vite, Playwright Chromium, and Mailpit.

## Results

| Check | Result | Evidence |
|---|---|---|
| Frontend production build | Passed | Vite build; bundle-size advisory remains |
| Frontend architecture | Passed after refactor | 129 modules checked; evidence/refactoring.json |
| Backend production build | Passed | NestJS TypeScript compilation |
| API regression | 51 passed / 0 failed | evidence/api-report.md |
| Local SMTP integration | 8 passed / 0 failed | evidence/email-report.md |
| Browser regression | 9 passed / 0 failed after refactor | evidence/playwright-report.md |
| Production preview | Nonblank PDF; worker HTTP 200; no page errors | evidence/production-preview.json |
| Demonstration screenshots | Actual local UI and Mailpit capture | evidence/demo-evidence.json |

## What the checks establish

- Existing submission, upload, permissions, review, resubmission, portal archive, and local placeholder-publish behavior remain covered.
- Metadata persists in the correct fields; description and untouched fields remain intact; the main title matches the edited title; before/after audit data is recorded.
- Editing is restricted to an active Editor step. History rejects unrelated students and unassigned reviewers. Anonymous history requests fail.
- Return-to-Editor requires a reason, preserves academic approval and files, moves the item between the correct queues, and supports correction/forwarding/archive. Duplicate returns cannot both commit.
- Local Mailpit receives actual submission/decision/archive/return notifications; the return email contains the director's reason. SMTP failure does not invalidate the submission.
- Browser coverage includes actual nonblank PDF.js page rendering, failed metadata save, failed return and preserved reason, archive confirmation, PDF failure/retry, and Vietnamese mobile layout.

## Environment and harness corrections

The test database is disposable `thesis_test`, on local port 5433. Suites reset it and must run sequentially. The browser runner now prepares this database before starting the API; doing so in Playwright globalSetup previously terminated an already connected API.

Existing browser helpers were updated for the read-only faculty field and explicit English test locale. Decision buttons now have stable accessible labels, including while a loading icon is present. Visual QA also exposed a malformed legacy PDF fixture; a valid two-page fixture and PDF.js replaced the blank native-frame evidence; the browser test now checks actual rendered, nonwhite page pixels rather than only a loaded URL. Test reports are generated under frontend/docs/evidence.

Postman CLI in this environment does not support `postman status`. No Postman workspace, external collection, mock, or hosted service was used. Verification reuses the project's existing Jest/Supertest and Playwright suites. No simulation of a real DSpace service is claimed.

## Limits and outstanding team dependencies

| Integration | Status | Required before claiming completion |
|---|---|---|
| PAdES signing and certificate verification | Not implemented by this UI package | Real signing module, output file, and authoritative verification metadata; director archive must call it |
| Live DSpace publication | Not verified | Configured reachable DSpace instance, real collection, successful item/bitstream publication |
| Production email | Not verified | Real SMTP configuration and recipient delivery verification |
| Current HCMUT policy text | Not independently verified | Updated official deposit policy/form URLs; old links redirect to university home |
| Full keyboard/screen-reader audit | Not performed | Dedicated accessibility review beyond labels and browser interaction checks |

Portal `archived`, a placeholder item ID, a local SMTP capture, and successful UI tests must not be presented as evidence of a verified signed document or successful live DSpace publication.
