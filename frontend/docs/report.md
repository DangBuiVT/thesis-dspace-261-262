# Thesis Portal UI: weeks 1-6 submission

**Author:** Nhan, Frontend & DSpace UI. **Assignment period:** 28 September-8 November 2026. **Analysis, implementation and evidence date:** 4 November 2026, Asia/Ho_Chi_Minh.

## 1. Purpose and scope

This package completes the frontend work assigned through week 6: research, screen inventory, component selection, wireframes, role/email flows, portal skeleton, review queues, embedded PDF viewing, decision dialogs, Editor metadata editing, Final Editor actions, approval history, and an email demonstration. Existing student submission and administration functions are retained. New collection-role administration and deposit-certificate templates belong to later weeks.

The two research targets are the existing thesis deposit portal and the standard DSpace repository UI, as agreed for this submission. The design is a project adaptation of DSpace workflow concepts, not a claim that the React interface is the DSpace Angular application or an exact visual clone.

## 2. Source analysis and design findings

The initial source already implemented local/optional Google login, Vietnamese/English localization, configurable submission fields, PDF upload, drafts, student tracking, assigned reviewer queues, library intake, director archival, and administration. Most interface behavior lived in a large App component. Existing documentation and September test reports lagged behind the current source, so historic checkmarks were not used as proof of current correctness.

The main gaps were an absent Editor metadata form, separate-tab PDF access, incomplete audit presentation, and a director rejection action that contradicted the week-6 return-to-Editor requirement. Backend inspection also found that the new metadata endpoint wrote abstract into description and attempted to update a nonexistent submissions.updated_at column. These were corrected without a schema migration.

The frontend retains React 18, Vite, Ant Design 5, HCMUT branding, and Vietnamese/English support. New reusable components isolate the queue, PDF preview, metadata form, history adapter/timeline, and shared review workspace. The layout provides collection context, current-stage badges, metadata/PDF columns, clear role actions, and a mobile stacked layout.

### Research limitations

The repository's supplied HCMUT deposit summary was mapped to the existing form and file requirements. Its old Form 10 and Form 12 links redirected to the university home page on the research date. Current institutional policy text could not be independently confirmed. The report therefore distinguishes supplied guidance from verified current policy.

The official DSpace demo information, UI source, and DSpace 7 Configurable Workflow documentation informed the design. The current public demo is not a pinned version of this project's DSpace integration, and its authenticated screens were not visually verified. Editable annotated wireframes record the intended project design.

## 3. Implemented behavior

### Submission and assigned queues

The existing submission form and draft/resubmission flows remain available. A shared queue wrapper supplies a consistent empty state and current-stage labels. Persistent error/retry feedback supplements existing refresh/loading behavior. Workflow annotations are now returned in student/staff lists as well as review queues, allowing actions to follow the actual configured step.

### PDF preview and Editor metadata

Authorized readers can inspect the PDF inside the shared workspace. The file is fetched using the existing protected API and Authorization header; a lazily loaded PDF.js canvas renderer uses a temporary blob URL and provides previous/next page controls. Screenshot review exposed a malformed, blank legacy test fixture. It was replaced with a valid two-page PDF, and PDF.js makes page rendering and navigation explicitly verifiable. Switching files or closing the workspace aborts pending requests and releases object URLs. Open/Download and retry feedback cover unavailable preview, encrypted/invalid PDFs, or missing files.

At the active Editor step, library staff can edit Vietnamese/English titles, advisors, major, year, abstract, and keywords. The browser sends changed values; the server preserves omitted fields, validates configured core requiredness, updates the correct columns, and synchronizes the queue title. Description remains separate from abstract. A transactional metadata_updated event records the actor and before/after changes. A no-op save does not invent a change event.

### Final Editor return and archive

The director interface exposes Return to Editor and Commit to Archive. Return requires a reason, moves the configured submission to the nearest previous Editor step, and preserves its academic decisions and PDF. Editor correction and acceptance bring it forward again. Director rejection to the student is disallowed by the server. Archive requires UI confirmation and remains restricted to a final director step. Configured nonfinal director steps retain acceptance.

Requests check the current step while holding the submission row lock, so stale duplicate returns cannot both commit. Frontend in-flight guards prevent duplicate decision requests. Reject/return dialogs remain open with their input when the request fails.

### Approval history and email

One history adapter accepts the existing role/actorRole variants and legacy SUBMIT/RESUBMIT names. The timeline shows actors, roles, timestamps, comments, status changes, and metadata diffs. The history API restricts access to the submitter/coauthors, assigned reviewers, and authorized staff.

The existing mail service is used for local SMTP delivery. A new return notification tells library staff what to correct. Mailpit displays actual portal-generated workflow messages; it is a separate local demonstration surface. SMTP failure does not undo a committed workflow action. Email integration tests match message content to avoid confusing delayed earlier-stage mail with the decision being tested.

## 4. Weekly traceability and artifacts

| Week | Assignment | Submission evidence |
|---|---|---|
| 1 | UI/deposit research; view inventory | research-and-requirements.md |
| 2 | Components and wireframes | Ant Design decision; wireframes.html; PNG design frames |
| 3 | Role and email flows | flows.md; use-cases.svg and editable PlantUML |
| 4 | Skeleton and task queues | Shared queue, role navigation, stage labels, feedback, responsive shell |
| 5 | PDF, decisions, Editor form | Working preview, validated metadata editing, resilient dialogs, audit diffs |
| 6 | Final Editor, history, inbox | Return/archive actions, history, local Mailpit screenshots and sanitized evidence |

The dates describe assignment coverage, not retrospective completion dates. All newly collected evidence is dated 4 November 2026. Artifact navigation is in README.md; validation.md records the actual checks, and demo-script.md provides a repeatable role-based demonstration.

## 5. Verification and remaining integrations

Validation includes both production builds, the existing API regression suite plus new workflow tests, actual local Mailpit integration, and browser workflows. Tests cover persistence after reload, unchanged description, actual audit payloads, stage restrictions, unauthorized readers, required reasons, repeated returns, rejection/resubmission, archive confirmation, PDF retry, failed requests, and mobile Vietnamese presentation. Exact results and reproducible commands are in validation.md.

The browser harness was corrected to prepare the disposable database before starting NestJS. The former global setup ran after the web server started and terminated its database connections. Existing browser helpers were aligned with the current read-only faculty selector and explicit English test locale.

Actual PAdES signing and certificate verification are still team dependencies. This package does not introduce a signing engine, attach a fabricated signature, or claim that archive produced a signed file. A future signing integration must provide the actual signed output and authoritative verification metadata before the UI can display success.

Live DSpace publication is not verified by this local package. The existing archive API returns dspaceDeferred=true; publication remains a separate authorized operation. Local placeholder-based tests confirm portal behavior only. The UI distinguishes archived-in-portal from publication pending/failed/confirmed.

## References

- Assignment: repository docs/Week Plan ( 15.10 updated ) - NEW PLAN.pdf, Nhan column, weeks 1-6.
- Supplied deposit guidance: repository docs/quy-dinh-nop-luu-chieu-thu-vien.md.
- DSpace official demo: https://dspace.org/demo/
- DSpace UI source: https://github.com/DSpace/dspace-angular
- DSpace 7 Configurable Workflow: https://wiki.lyrasis.org/spaces/DSDOC7x/pages/104566678/Configurable%2BWorkflow
- PDF.js examples and rendering model: https://mozilla.github.io/pdf.js/examples/
- Ant Design 5 components: https://5x.ant.design/components/overview/

See research-and-requirements.md for source status and the boundaries of each inference.
