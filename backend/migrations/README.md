# Submission form schema and question configuration

The form follows the [HCMUT library submission form](https://docs.google.com/forms/d/1gfCIYrDBvh56SwZb87Y0K-tpIKmSxXtLVmCNLj6QLh8/viewform).
The existing portal shell, cards, detail tabs, and PDF viewer are retained. Inside
the submission card, students complete the checklist before the thesis information.

## Read the schema

`GET /submissions/form-schema` requires an authenticated student, assigned-review
role, library staff, director, or administrator with the corresponding permission.
It returns `{ sections, fields }`. Sections are ordered database records containing
`key`, `title`, `description`, and `sortOrder`. Fields retain the existing IDs,
storage mappings, `required` and `enabled` flags, and add:

| Property | Meaning |
| --- | --- |
| `mode` | `mandatory`, `optional`, or `hidden` |
| `sectionKey` | `checklist` or `metadata` |
| `questionNumber` | Original question number; null for additional portal fields |
| `helpText` | Question instructions, including the PDF filename/consent notice |
| `validation` | `allOptions: true` requires a complete component checklist when answered |

`GET /submissions/form-fields` remains an enabled-fields-only array for existing
callers. The frontend loads the full schema, refreshes after configuration changes
in the same window, and reloads when returning to the window/tab. A failed schema
request shows a retry action and prevents submission with unknown requirements.

## Configure a question

The administrator uses **Submissions → Submission fields → Question mode**.
The existing edit dialog also supports the mode, step, label, help text, options,
input type, and order. All changes persist in PostgreSQL.

`PATCH /admin/submission-form-fields/:fieldId` is restricted to the `admin` role
with `configure_system`. For example:

```json
{ "mode": "optional" }
```

| Mode | Database flags | Student behavior |
| --- | --- | --- |
| `mandatory` | enabled=true, required=true | Red star; required on Next/Submit and enforced by the API |
| `optional` | enabled=true, required=false | No red star; an empty answer is accepted |
| `hidden` | enabled=false, required=false | No question; no required-answer validation |

The two flags are changed atomically. Legacy requests using `required`/`enabled`
remain supported; `mode` takes precedence when supplied. Built-in question keys
cannot be renamed or deleted; hide a question instead. Hidden historical answers
are retained, so changing configuration never erases an existing submission.

## Original questions and storage

| # | Key | Default | Storage / input |
| --- | --- | --- | --- |
| 1 | `email` | Mandatory | `student_email`, editable email |
| 2 | `submissionAttempt` | Mandatory | `extra_metadata`, checkboxes: 1, 2, 3 |
| 3 | `components` | Mandatory | `extra_metadata`, all 13 original component options |
| 4 | `titleVi` | Mandatory | `title_vi`, paragraph |
| 5 | `titleEn` | Mandatory | `title_en`, paragraph |
| 6 | `authorIds` | Mandatory | Existing author accounts and full-name snapshot |
| 7 | `thesisAdvisors` | Mandatory | `thesis_advisors`, first advisor's full name |
| 8 | `advisor2` | Optional | `extra_metadata`, second advisor's full name |
| 9 | `reviewer1` | Mandatory | `extra_metadata`, full name |
| 10–13 | `reviewer2` … `reviewer5` | Optional | `extra_metadata`, separate full-name answers |
| 14 | `major` | Mandatory | Existing major column |
| 15 | `thesisYear` | Mandatory | Existing year column, four digits when answered |
| 16 | `archiveFacultyId` | Mandatory | Existing student's faculty; selection stored with the answers |
| 17 | `thesisFile` | Mandatory | Existing protected PDF upload, naming guidance `MSHV-HovaTen.pdf` |

The author account picker uses existing student records and their full names.
Faculty defaults to the student's profile. Administrators retain the existing
per-submission faculty override, including **Other (enter faculty name)**. A
hand-typed faculty has no semester or submission period. Administrators also retain
the three per-submission review-step switches; skipping reviewer review removes
the review-assignment requirement. Reviewer names are form
answers; **Review assignments** continues to select authenticated reviewer accounts
for workflow access. Semester and submission period continue to route the thesis
through the existing archive model. These additional routing fields keep their
existing default requiredness and can also be made optional or hidden by an admin.
Extra legacy DSpace metadata inputs are hidden by default; their stored values and
column mappings remain available. The second advisor is included in the configured
DSpace advisor mapping.

## Submit, draft and resubmit

The existing multipart submission/draft endpoints remain in use. Additional
answers are supplied in the `metadata` JSON object (or its multipart JSON string):

```json
{
  "submissionAttempt": ["1"],
  "components": ["cover", "approval", "assignment", "acknowledgements", "abstracts", "declaration", "contents", "lists", "fulltext", "publications", "references", "appendices", "biography"],
  "advisor2": "Nguyen Van B",
  "reviewer1": "Tran Van C"
}
```

Checkbox answers also accept a JSON-array string. They are stored as JSON-array
strings in the existing `extra_metadata` object for compatibility. Unknown options
and malformed arrays are rejected. A mandatory component answer must contain all
13 components; an optional answer may be empty. A nonempty component answer must
still contain the whole checklist. Hidden answers are not validated.

Drafts allow incomplete mandatory answers and partial checklists. Submitting a
draft/resubmitting checks the current configuration, merges saved answers, and
keeps the current PDF unless a replacement is uploaded. Empty strings/arrays clear
visible optional answers; omitted answers preserve their saved value. A missing
email can use the account email; an explicitly empty optional email stays empty.
Ownership and authorization remain mandatory internal invariants regardless of
the author's question mode.

## PDF previews

Students and admins can preview a selected local PDF before uploading, using the
same PDF.js renderer as the submission detail pages. All five roles can preview
their authorized submissions, switch pages, open, download, and retry failed loads.
Object URLs and pending requests are cleaned up when the file or view changes.
The existing file endpoint still rejects unrelated students and unassigned reviewers.

## Database upgrade

`backend/migrations/003_submission_form.sql` is run automatically at API startup.
The same migration is included in `db/init/003_submission_form.sql` for new Docker
databases and appended to `db/thesis_portal_full.sql` for standalone installs.
It uses a transaction, advisory lock, and migration marker. Repeated starts do not
reset admin choices or overwrite saved answers. Existing databases need an API
restart, not a volume reset.
