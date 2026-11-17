import { Client } from "pg";
import { readFileSync } from "fs";
import path from "path";
import {
  closeApi, createUser, deleteSubmission, ensureOpenPeriod, http, initApi, login,
  pdfBuffer, postMultipart, studentSubmissions, thesisFields,
} from "./helpers";

describe("Google Form schema, configurable questions and PDF access", () => {
  let admin: string;
  let periodId: string;
  let fields: any[];
  const keys = ["email", "submissionAttempt", "components", "titleVi", "titleEn", "authorIds", "thesisAdvisors", "advisor2", "reviewer1", "reviewer2", "reviewer3", "reviewer4", "reviewer5", "major", "thesisYear", "archiveFacultyId", "thesisFile"];
  beforeAll(async () => {
    await initApi();
    admin = (await login("admin1", "admin123")).token;
    periodId = (await ensureOpenPeriod()).periodId;
    fields = (await http().get("/admin/submission-form-fields").set("Authorization", `Bearer ${admin}`)).body;
  });
  afterAll(closeApi);
  async function mode(field: any, value: string) {
    const response = await http().patch(`/admin/submission-form-fields/${field.id}`)
      .set("Authorization", `Bearer ${admin}`).send({ mode: value });
    expect(response.status).toBe(200);
    expect(response.body.mode).toBe(value);
  }

  it("exposes the original 17 questions in two ordered sections", async () => {
    const student = await createUser("student");
    const response = await http().get("/submissions/form-schema").set("Authorization", `Bearer ${student.token}`);
    expect(response.status).toBe(200);
    expect(response.body.sections.map((section: any) => section.key)).toEqual(["checklist", "metadata"]);
    expect(response.body.fields.filter((field: any) => field.questionNumber).map((field: any) => field.fieldKey)).toEqual(keys);
    expect(response.body.fields.find((field: any) => field.fieldKey === "components").options).toHaveLength(13);
  });

  it.each(keys)("enforces mandatory/optional/hidden for %s on the server", async key => {
    const field = fields.find(item => item.fieldKey === key);
    const student = await createUser("student");
    const values = thesisFields(periodId, student.id, ["reviewer1"]);
    const answers = JSON.parse(values.metadata);
    if (["submissionAttempt", "components"].includes(key)) answers[key] = [];
    else if (["advisor2", "reviewer1", "reviewer2", "reviewer3", "reviewer4", "reviewer5"].includes(key)) answers[key] = "";
    else values[key] = key === "authorIds" ? "[]" : "";
    values.metadata = JSON.stringify(answers);
    const file = key === "thesisFile" ? undefined : { buffer: pdfBuffer, filename: "student-fullname.pdf" };
    try {
      await mode(field, "mandatory");
      const missing = await postMultipart("/submissions", student.token, values, file);
      expect(missing.status).toBe(400);
      for (const value of ["optional", "hidden"]) {
        await mode(field, value);
        const submitted = await postMultipart("/submissions", student.token, values, file);
        expect({ status: submitted.status, message: submitted.body.message }).toEqual({ status: 201, message: undefined });
        await deleteSubmission(admin, submitted.body.id);
      }
    } finally {
      await mode(field, field.mode);
    }
  });

  it("saves partial checklists as drafts, rejects incomplete submission and keeps saved answers", async () => {
    const student = await createUser("student");
    const values = thesisFields(periodId, student.id, ["reviewer1"]);
    const complete = JSON.parse(values.metadata);
    values.metadata = JSON.stringify({ ...complete, components: ["cover"] });
    const draft = await postMultipart("/submissions/drafts", student.token, values, { buffer: pdfBuffer, filename: "student-fullname.pdf" });
    expect(draft.status).toBe(201);
    try {
      const incomplete = await postMultipart(`/submissions/${draft.body.id}/submit`, student.token, { studentId: student.id, authorIds: JSON.stringify([student.id]) });
      expect(incomplete.status).toBe(400);
      expect(incomplete.body.message).toContain("13 components");
      values.metadata = JSON.stringify(complete);
      const submitted = await postMultipart(`/submissions/${draft.body.id}/submit`, student.token, values);
      expect(submitted.status).toBe(201);
      const record = (await studentSubmissions(student.token, student.id)).body.find((row: any) => row.id === draft.body.id);
      expect(JSON.parse(record.extra_metadata.components)).toHaveLength(13);
      expect(record.extra_metadata.reviewer1).toBe("Reviewer One");
    } finally { await deleteSubmission(admin, draft.body.id); }
  });

  it.each(["other", "existing"])("preserves the current admin %s faculty override and review-step controls", async kind => {
    const student = await createUser("student");
    const values = thesisFields(periodId, student.id, []);
    values.workflowRoles = JSON.stringify(["library_staff", "director"]);
    if (kind === "other") {
      values.archiveFacultyId = "__other__";
      values.facultyOtherName = "External faculty for schema regression";
      delete values.submissionPeriodId;
      values.archiveSemesterId = "";
    } else {
      values.facultyId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005";
      values.archiveFacultyId = values.facultyId;
      values.archiveSemesterId = "c1000001-0001-4000-8000-000000000001";
      values.submissionPeriodId = "a2000001-0001-4000-8000-000000000001";
    }
    const response = await postMultipart("/submissions", admin, values, { buffer: pdfBuffer, filename: "admin-faculty.pdf" });
    expect({ status: response.status, message: response.body.message }).toEqual({ status: 201, message: undefined });
    try {
      const row = (await studentSubmissions(student.token, student.id)).body.find((item: any) => item.id === response.body.id);
      expect(row.current_step_role).toBe("library_staff");
      if (kind === "other") {
        expect(row.faculty_name).toBe(values.facultyOtherName);
        expect(row.submission_period_id).toBeNull();
      } else expect(row.submission_period_id).toBe(values.submissionPeriodId);
    } finally { await deleteSubmission(admin, response.body.id); }
  });

  it("rejects unknown and malformed checkbox answers", async () => {
    const student = await createUser("student");
    for (const components of [["invented"], "not-json"]) {
      const values = thesisFields(periodId, student.id, ["reviewer1"]);
      values.metadata = JSON.stringify({ ...JSON.parse(values.metadata), components });
      const response = await postMultipart("/submissions/drafts", student.token, values);
      expect(response.status).toBe(400);
    }
  });

  it("keeps admin modes and existing answers after reapplying the migration", async () => {
    const field = fields.find(item => item.fieldKey === "components");
    await mode(field, "hidden");
    const db = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER, password: process.env.POSTGRES_PASSWORD });
    try {
      await db.connect();
      await db.query(readFileSync(path.join(process.cwd(), "migrations", "003_submission_form.sql"), "utf8"));
      const current = (await http().get("/admin/submission-form-fields").set("Authorization", `Bearer ${admin}`)).body;
      expect(current.find((item: any) => item.id === field.id).mode).toBe("hidden");
    } finally { await db.end(); await mode(field, field.mode); }
  });

  it("allows PDF preview for all five roles and denies unrelated users", async () => {
    const student = await createUser("student");
    const stranger = await createUser("student");
    const unassigned = await createUser("reviewer");
    const submission = await postMultipart("/submissions", student.token, thesisFields(periodId, student.id, ["reviewer1"]), { buffer: pdfBuffer, filename: "student-fullname.pdf" });
    expect(submission.status).toBe(201);
    try {
      const record = (await studentSubmissions(student.token, student.id)).body.find((item: any) => item.id === submission.body.id);
      const url = `/submissions/${record.id}/files/${record.files[0].id}/download`;
      const sessions = [student.token, admin];
      for (const [name, password] of [["reviewer1", "review123"], ["library1", "library123"], ["director1", "director123"]]) {
        sessions.push((await login(name, password)).token);
      }
      for (const token of sessions) {
        const response = await http().get(url).set("Authorization", `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toContain("application/pdf");
        expect(response.headers["content-disposition"]).toContain("inline");
        expect(response.body.subarray(0, 4).toString()).toBe("%PDF");
      }
      for (const token of [stranger.token, unassigned.token]) {
        expect((await http().get(url).set("Authorization", `Bearer ${token}`)).status).toBe(403);
        expect((await http().patch(`/admin/submission-form-fields/${fields[0].id}`).set("Authorization", `Bearer ${token}`).send({ mode: "hidden" })).status).toBeGreaterThanOrEqual(400);
      }
    } finally { await deleteSubmission(admin, submission.body.id); }
  });
});
