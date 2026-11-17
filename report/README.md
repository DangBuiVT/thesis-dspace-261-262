# Thesis report

`main.tex` updates the supplied team outline using the previous capstone report as attributed baseline context and the changes from `main` (`4f7a73df`) to `UI-build` (`3d97faf3`). The revision date is 5 November 2026; application evidence remains dated 4 November 2026.

The seven-chapter structure, team details, and 11-week assignment are retained. The report expands the analysis, implementation, evaluation, and conclusion; corrects Director rejection to return-to-Editor; distinguishes portal archival from DSpace publication; adds the feature refactor, PDF stability fix, Docker seed changes, screenshots, references, and evidence traceability.

Signing, signed certificates, print controls, batch signing, SSO, and other unfinished integrations are described as planned. Recorded test results are attributed to their existing reports and are not presented as new runs during this document revision.

Compile from this directory with a LaTeX installation supporting the packages in the preamble, for example:

```powershell
tectonic main.tex
```

Keep `report-assets` beside `main.tex`. It contains the repository's HCMUT logo and existing local UI captures, copied without alteration. Diagrams are native TikZ in the source. `main.pdf` is the compiled report.
