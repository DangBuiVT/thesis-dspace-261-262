# Frontend workflow API contract

All browser requests use `/api`; Vite/Nginx removes that prefix before NestJS. Existing JWT authentication and permission guards remain in place. No database migration is required.

## Editor metadata

`PATCH /api/submissions/:id/metadata`, authorized library staff/admin **while the submission is actively at an Editor step** and status is `reviewing`.

```json
{
  "titleEn": "Corrected English title",
  "abstract": "Corrected abstract",
  "keywords": "archives, metadata"
}
```

The UI offers `titleVi`, `titleEn`, `thesisAdvisors`, `major`, `thesisYear`, `abstract`, `keywords`. Omitted fields are preserved. Server validation honors configured core requiredness and validates a four-digit year. Empty optional strings clear optional values. The API also supports existing scalar description/publication metadata; unsupported fields produce an error. No-op saves return no changes and create no misleading audit event.

```json
{
  "ok": true,
  "changes": [{"field":"abstract","before":"Original abstract","after":"Corrected abstract"}]
}
```

The update is transactional. `abstract` updates the abstract column, not description. A changed English/Vietnamese title also synchronizes the main queue title. `metadata_updated` stores the actual actor role, readable field changes, and optional comment.

## Final Editor return

`POST /api/reviews/director-action`

```json
{"submissionId":"<uuid>","action":"return_to_editor","comment":"Normalize keywords before archive."}
```

Director role and active director stage are required. Blank reasons fail. The nearest earlier library_staff step becomes current; status becomes `reviewing`; files and academic decisions remain intact. History records `director_returned` with comment/fromStep/toStep and `status_changed`. Concurrent duplicate returns cannot both commit. If no earlier Editor exists, the request fails without changing state.

Director `reject` fails. `approve` remains available for configured nonfinal director steps; `archive` is restricted to the final director step. Earlier-stage endpoints reject `return_to_editor`.

## History

`GET /api/submissions/:id/history`

Access: submitter/coauthor, assigned reviewer, or authorized library/director/admin. Unrelated students and reviewers receive 403; anonymous callers receive 401. Missing submissions receive 404.

Events expose `id`, `eventType`, `actorId`, `actorRole`, `actorName`, `createdAt`, `payload`; legacy role/comment/action fields are retained. The frontend adapter accepts `role` or `actorRole` and normalizes `SUBMIT`/`RESUBMIT`. Existing embedded `workflow_history` uses the same timeline renderer.

## Files and archive semantics

- `GET /api/submissions/:id/files/:fileId/download`: existing protected inline stream. The UI uses an Authorization header and a temporary blob URL; it never embeds a JWT into a URL. Object URLs are revoked on file change/unmount; PDF.js renders actual pages with previous/next navigation and cleans up workers/render tasks.
- `POST /api/reviews/director-action` with `action: "archive"`: existing portal commit, returning `ok` and `dspaceDeferred: true`. No live DSpace publication or verified signature is implied.
- Queue/list responses include `current_step_role` and `current_step_is_last` so UI permissions follow the configured workflow rather than inferring the stage from a broad status.
- Dialogs preserve user input on failure. HTTP success is required before closing or updating the screen; duplicate in-flight actions for the same submission are guarded.
