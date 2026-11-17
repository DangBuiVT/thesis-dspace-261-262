# Nhan's frontend submission: weeks 1-6

Coverage: **28 September-8 November 2026**. Evidence collected on **4 November 2026 (Asia/Ho_Chi_Minh)**; dates are not backdated to the assigned weeks.

Start with [the report](report.md) and its [PDF export](nhan-ui-weeks-1-6.pdf).

| Artifact | Purpose |
|---|---|
| [Research and requirements](research-and-requirements.md) | Portal/DSpace comparison, HCMUT guidance, component choice, view inventory, six-week traceability |
| [UI wireframes](wireframes.html) | Standalone annotated submission, task queue, and review workspace designs; open in a browser |
| [Use cases](diagrams/use-cases.svg) | Viewable actor/use-case diagram; editable [PlantUML source](diagrams/use-cases.puml) |
| [Role and email flows](flows.md) | Editable Mermaid workflow, UI navigation, sequence, and notification diagrams |
| [API contract](api-contract.md) | Metadata editing, history access, return transition, and archive semantics |
| [Demo script](demo-script.md) | Repeatable role-based demonstration and Mailpit setup |
| [Local demo data](demo-data.md) | Seed command, accounts, seven workflow scenarios, PDF fixtures, and verification |
| [PDF preview stability](pdf-preview-stability.md) | Scrollbar resize-loop diagnosis, fix, screenshots, and regression coverage |
| [Home and task navigation](home-navigation.md) | Logo/breadcrumb links, role-specific `/home`, accessibility, language, and browser history |
| [Validation](validation.md) | Actual build/test results, environment, and remaining integration limits |
| [Frontend architecture and refactor](refactoring.md) | Feature ownership, dependency diagram, before/after entry-point sizes, local skills, and maintenance checks |
| [Screenshots](screenshots/README.md) | Before/after UI evidence, responsive view, and actual Mailpit inbox |

All UI documentation and generated submission artifacts are stored in this directory. Runtime application code is in `frontend/src/app` and `frontend/src/features`; the review workspace lives in `frontend/src/features/submissions/workflow`. Backend implementation and automated tests stay in their normal source directories.

## Reproduce validation

From the repository root, install locked dependencies in the root, `frontend`, and `backend` using `npm ci`. Start PostgreSQL on port 5433 and Mailpit on ports 1025/8025. Then run these **sequentially**, because the suites recreate the disposable `thesis_test` database:

```powershell
npm --prefix frontend run check:architecture
npm --prefix frontend run build
npm --prefix backend run build
npm --prefix backend run test:e2e -- --silent
npm --prefix backend run test:email -- --silent
npm run test:e2e
```

The test setup drops/recreates **thesis_test**. Use a local development database service; never point these tests at production. Browser tests automatically launch API port 3001 and frontend port 5174.

To capture fresh screenshots and sanitized Mailpit evidence after the tests:

```powershell
npm --prefix backend run build
# Start API against thesis_test, DB_PORT=5433, PORT=3001; start Vite with API_PROXY_TARGET=http://127.0.0.1:3001 on port 5174.
node frontend/docs/capture-evidence.cjs
```

To regenerate the PDF using Python with reportlab installed:

```powershell
python frontend/docs/build-report.py
```

New collection-role administration, deposit certificates, actual PAdES signing, and live DSpace publishing remain separate team work. The UI does not fabricate successful signing or publication.
