# Demonstration script

Use isolated local data. The seed accounts are student1/student123, reviewer1/review123, library1/library123, director1/director123, admin1/admin123. Create an open faculty/semester/submission period using the existing configuration screen, or use the test database's Automation Period. The student's faculty must match the period.

## Prepare

1. Start PostgreSQL on host port 5433 and Mailpit on SMTP 1025 / UI 8025. Start the backend with DB_PORT=5433 and frontend with the matching API proxy.
2. As admin, enable email and set smtp_host=127.0.0.1, smtp_port=1025, smtp_secure=false, and a local sender such as `Thesis Portal <noreply@localhost>`. In Docker Compose the SMTP host is `mailpit` instead of 127.0.0.1.
3. Use a valid local PDF. Keep the real DSpace credentials and real certificates out of the demo.
4. Open [Mailpit](http://127.0.0.1:8025) separately. It captures portal-generated emails without delivering them to real recipients.

## Five-minute primary demonstration

| Step | Actor | Show |
|---|---|---|
| 1 | Student | Complete metadata, save draft, upload PDF, submit, observe academic stage |
| 2 | Reviewer | Find assigned thesis; open shared workspace; inspect PDF; accept |
| 3 | Editor | Open metadata/PDF view; correct abstract/keywords; save; show before/after history |
| 4 | Editor | Accept; demonstrate transfer to Final Editor |
| 5 | Director | Show Return to Editor and Commit to Archive; no Reject-to-student action |
| 6 | Director | Enter a return reason; return to Editor |
| 7 | Editor | Show preserved academic approval and unchanged PDF; inspect return reason; correct and accept |
| 8 | Director | Confirm archive; explain that DSpace publication is a separate step |
| 9 | Student | Show archived progress/history; do not claim the file is signed or published |
| 10 | Demo operator | Show actual Mailpit messages, recipient, title, return reason, and archive notice |

## Rejection and failure demonstration

- Use a second submission: reviewer or Editor rejects with a required reason; student revises and resubmits. Academic review restarts on resubmission, whereas return-to-Editor preserves academic decisions.
- Attempt a blank return reason; explain validation. Browser regression tests also inject failed saves/returns and verify that input remains.
- Switch VI/EN and show the 390px mobile workspace.
- A missing PDF displays retry feedback; the preview supplies Open/Download fallback.

## Outstanding team integrations

Actual PAdES signing/certificate verification is not implemented by this UI package. The director archive path does not yet call a signing module or return verified signature metadata. Live DSpace publication is also not verified here. These are recorded as dependencies, not successful demo steps.
