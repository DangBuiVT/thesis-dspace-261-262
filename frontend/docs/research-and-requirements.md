# Research, requirements, and six-week traceability

Author: Nhan (frontend responsibility). Research date: 4 November 2026. Assignment source: the Nhan/Frontend & DSpace UI column in `docs/Week Plan ( 15.10 updated ) - NEW PLAN.pdf`, weeks 1-6 only.

## Research targets and evidence

The agreed two study targets are this thesis deposit portal and the standard DSpace repository UI.

| Topic | Existing portal | DSpace reference | Design decision |
|---|---|---|---|
| Architecture | React 18 + Ant Design 5; NestJS mediates all protected actions | Official DSpace UI uses Angular | Retain React; adopt repository navigation and workflow concepts |
| Submission | Configurable form, faculty/semester/period, draft, PDF upload | MyDSpace groups submission/review work | Keep existing form/data model and provide one consistent workspace |
| Review | Explicit reviewer assignments and configured role steps | Configurable Workflow supports role-based steps and task assignment methods | Show current stage and assigned queues; do not invent claim/unclaim APIs |
| Editor | Metadata API existed but had no UI; abstract was mapped to description | Workflow steps can permit editing | Introduce Editor form and field-level audit evidence |
| Final step | Archive/reject existed | Outcomes depend on workflow configuration | Follow this project's required return-to-Editor policy; it is a project rule, not a universal DSpace rule |
| Publication | Portal archive and DSpace publish are separate operations | DSpace is the repository target | Show portal archive separately from confirmed DSpace publication |

Primary sources checked:

- [DSpace official demo and access information](https://dspace.org/demo/): the demo follows the current released code. It is a reference, not a pinned-version visual specification.
- [DSpace UI source](https://github.com/DSpace/dspace-angular): Angular reference implementation.
- [DSpace 7 Configurable Workflow](https://wiki.lyrasis.org/spaces/DSDOC7x/pages/104566678/Configurable%2BWorkflow): reference aligned with this project's documented DSpace 7 integration. Concepts used: steps, roles, outcomes, notifications. Live authenticated demo screens were not visually verified during research.
- [Ant Design 5 components](https://5x.ant.design/components/overview/): implementation reference for Layout, Table, Tabs, Form, Timeline, Modal and Upload.

## HCMUT deposit guidance

Repository source: `docs/quy-dinh-nop-luu-chieu-thu-vien.md`, an existing summary of supplied library guidance, explicitly marked as requiring confirmation against the current institutional policy.

| Supplied guidance | UI mapping | Boundary |
|---|---|---|
| Full thesis in one PDF | Existing required thesis PDF upload; embedded preview | PDF content/signature verification belongs to backend/signing work |
| Thesis/dissertation metadata | Titles, authors, advisors, year, abstract, keywords, type, language | Existing configurable fields retained |
| Revisions after defense and approvals | Rejection/resubmission and three review stages | Portal approvals alone do not prove institutional legal compliance |
| Supporting materials may be required | Research requirement recorded | Additional upload types are not introduced into the current one-PDF API |
| Formatting templates and library support | Documented reference links | Do not add mandatory checkboxes without a confirmed current requirement |

The historic links for [Form 10](https://pgs.hcmut.edu.vn/vi/thac-si/hoc-vu/bieu-mau/item/75-bieu-mau-10-mau-trinh-bay-lv) and [Form 12](https://pgs.hcmut.edu.vn/vi/thac-si/hoc-vu/bieu-mau/item/77-bieu-mau-12-quy-dinh-nop-lv-va-mau-trinh-bay-nhan-dia-cd-luu-lv) redirected to the HCMUT home page when checked on 4 November. Current policy wording therefore remains unverified; this submission documents the supplied guidance rather than asserting it as current official policy.

## Component choice

Keep Ant Design 5 and the installed React stack. It already supplies accessible forms, dialogs, locale support, tables, responsive controls and history presentation. Adding Tailwind or migrating to Angular would duplicate styling and increase integration work without closing a week 1-6 requirement. PDF.js 6.5.438 supplies browser-independent canvas rendering after visual QA exposed blank embedded previews and a malformed legacy fixture; it is loaded only when a PDF is opened. [Mozilla PDF.js examples](https://mozilla.github.io/pdf.js/examples/) document document loading, page rendering, cancellation, and page navigation.

The design uses HCMUT blue, a white content surface, restrained borders, collection context, and compact tables.

## View inventory

| View | Actor | Capability |
|---|---|---|
| Login | All | Local login and existing optional Google login |
| My submissions / form | Student | Draft, submit, track, revise after rejection |
| Academic queue | Reviewer | Assigned pending/completed/rejected work; PDF/metadata inspection; accept/reject |
| Editor queue | Library staff | Inspect PDF, edit metadata, accept/reject |
| Final queue | Director | Inspect, return to Editor with reason, confirm archive |
| Shared workspace | Authorized submission readers | Metadata/files/history; actions limited by stage and role |
| Existing administration/archive configuration | Admin / authorized staff | Retained behavior; no new week-7 collection-role administration |
| Mailpit | Local demo operator | Inspect real portal-generated email; separate from production portal |

## Weekly completion matrix

| Week | Dates | Deliverable and implementation evidence |
|---|---|---|
| 1 | Sep 28-Oct 4 | Research comparison, deposit-guidance mapping, view inventory in this document |
| 2 | Oct 5-11 | Ant Design choice; annotated submission/queue/workspace in wireframes.html |
| 3 | Oct 12-18 | Actor use cases, role/UI/workflow sequences, email flow and recipient table |
| 4 | Oct 19-25 | Existing role queues retained; shared TaskQueue, stage labels, empty/error/retry feedback, responsive shell |
| 5 | Oct 26-Nov 1 | Authenticated embedded PDF, retry/open/download, existing accept/reject with resilient reason dialogs, Editor metadata form |
| 6 | Nov 2-8 | Final Editor return/archive, readable audit diffs, real Mailpit notification evidence; backend contracts and tests |

Rows map the assignment to evidence; they do not claim the work was completed on those historic dates. See validation.md for actual test evidence and outstanding signing/live-publication limits.
