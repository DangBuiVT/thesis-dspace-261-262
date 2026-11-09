# Email integration test

- Timestamp (UTC): 2026-11-04T10:53:32.389Z
- Target: local (thesis_test)
- Total: 8
- Passed: 8
- Failed: 0
- Skipped: 0

| File | Test | Result | Duration |
|---|---|---|---|
| mail.e2e-spec.ts | TC-MAIL-001 emails the assigned reviewer and the student on submit | passed | 1016 ms |
| mail.e2e-spec.ts | TC-MAIL-002 includes the reject reason in the student email | passed | 871 ms |
| mail.e2e-spec.ts | TC-MAIL-003 emails library only after every reviewer approves | passed | 1402 ms |
| mail.e2e-spec.ts | TC-MAIL-004 emails the director after library approval | passed | 478 ms |
| mail.e2e-spec.ts | TC-MAIL-005 includes the library reject reason in the student email | passed | 652 ms |
| mail.e2e-spec.ts | TC-MAIL-006 emails the student when the director archives | passed | 993 ms |
| mail.e2e-spec.ts | TC-MAIL-008 notifies Editor with the director return reason | passed | 540 ms |
| mail.e2e-spec.ts | TC-MAIL-007 still accepts a submission when SMTP is unreachable | passed | 675 ms |
