// Additive local demo fixtures. Existing submissions and account settings are preserved.
const path = require("node:path");
const fs = require("node:fs/promises");
const { constants } = require("node:fs");
const { createHash } = require("node:crypto");
const { Pool } = require("pg");

const backendRoot = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(backendRoot, ".env"), quiet: true });
require("dotenv").config({ path: path.join(backendRoot, "..", ".env"), quiet: true });

function id(name) {
  const hex = createHash("sha256").update(`nhan-demo-v1:${name}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = "8";
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

const cases = [
  { key: "draft", title: "[DEMO] Smart Campus Thesis Deposit Portal", status: "draft", step: null, decision: "pending" },
  { key: "review", title: "[DEMO] Vietnamese Thesis Search with Semantic Embeddings", status: "reviewing", step: 1, decision: "pending" },
  { key: "editor", title: "[DEMO] IoT Air Quality Monitoring for University Buildings", status: "reviewing", step: 2, decision: "approved" },
  { key: "final", title: "[DEMO] Accessible Digital Repository for Academic Research", status: "approved", step: 3, decision: "approved" },
  { key: "returned", title: "[DEMO] Metadata Quality Assessment for Institutional Repositories", status: "reviewing", step: 2, decision: "approved" },
  { key: "rejected", title: "[DEMO] Machine Learning for Student Research Recommendations", status: "rejected", step: 1, decision: "reject" },
  { key: "archived", title: "[DEMO] Energy Efficient Scheduling in Smart Laboratories", status: "archived", step: 3, decision: "approved" },
];

const db = new Pool(process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 }
  : { host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 5433),
      database: process.env.POSTGRES_DB || "thesis_portal", user: process.env.POSTGRES_USER || "thesis_user",
      password: process.env.POSTGRES_PASSWORD || "thesis_pass", connectionTimeoutMillis: 5000 });

async function main() {
  const client = await db.connect();
  let created = 0;
  let skipped = 0;
  try {
    await client.query("BEGIN");
    // Serialize reruns so a second invocation cannot duplicate fixtures.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('nhan-demo-v1'))");
    const faculties = (await client.query("SELECT id, name FROM faculties WHERE status = 'active' ORDER BY id")).rows;
    const faculty = faculties.find(row => row.id === "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0005");
    if (!faculty) throw new Error("Initialize db/init/001_schema.sql before seeding demo data.");
    const now = new Date();
    const year = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    const periods = new Map();
    async function addPeriod(targetFaculty, academicYear, status) {
      const semesterId = id(`semester:${targetFaculty.id}:${academicYear}`);
      const periodId = id(`period:${targetFaculty.id}:${academicYear}`);
      const semesterName = `Học kỳ 1 - ${academicYear}/${academicYear + 1} (Demo)`;
      await client.query(`INSERT INTO semesters (id, faculty_id, name, status, created_by)
        VALUES ($1, $2, $3, 'active', 'admin1') ON CONFLICT (id) DO NOTHING`, [semesterId, targetFaculty.id, semesterName]);
      await client.query(`INSERT INTO submission_periods (id, semester_id, name, opens_at, closes_at, status, allow_resubmit, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, true, 'admin1') ON CONFLICT (id) DO NOTHING`,
        [periodId, semesterId, `Đợt nộp luận văn ${academicYear}/${academicYear + 1} (Demo)`,
          new Date(Date.UTC(academicYear, 8, 1)), new Date(Date.UTC(academicYear + 1, 8, 1)), status]);
      return { periodId, semesterName };
    }
    // The normal schema already contains these accounts. Only restore a missing one.
    for (const [username, password, displayName, role] of [
      ["admin1", "admin123", "Admin One", "admin"], ["student1", "student123", "Student Alpha", "student"],
      ["reviewer1", "review123", "Reviewer One", "reviewer"], ["library1", "library123", "Library Staff One", "library_staff"],
      ["director1", "director123", "Library Director", "director"],
    ]) await client.query(`INSERT INTO users (username, password, display_name, role, faculty_id)
      VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING`,
      [username, password, displayName, role, ["student", "reviewer"].includes(role) ? faculty.id : null]);
    for (const target of faculties) periods.set(target.id, await addPeriod(target, year, "open"));
    const archivedPeriod = await addPeriod(faculty, year - 1, "closed");

    for (const item of cases) {
      const submissionId = id(`submission:${item.key}`);
      if ((await client.query("SELECT 1 FROM submissions WHERE id = $1", [submissionId])).rowCount) { skipped++; continue; }
      const username = `demo.${item.key}`;
      const displayName = `Demo Student - ${item.key}`;
      await client.query(`INSERT INTO users (username, password, display_name, role, faculty_id)
        VALUES ($1, 'student123', $2, 'student', $3) ON CONFLICT (username) DO NOTHING`, [username, displayName, faculty.id]);
      const account = (await client.query("SELECT role, faculty_id FROM users WHERE username = $1", [username])).rows[0];
      if (account.role !== "student" || account.faculty_id !== faculty.id) throw new Error(`Existing account ${username} does not match the demo fixture.`);
      const period = item.key === "archived" ? archivedPeriod : periods.get(faculty.id);
      const createdAt = item.key === "archived" ? new Date(Date.UTC(year, 6, 15)) : new Date(now.getTime() - 7 * 86400000);
      const keywords = "digital repository; thesis; HCMUT";
      await client.query(`INSERT INTO submissions (
        id, title, title_vi, title_en, author, reviewer, abstract, keywords, student_id, status, current_step,
        submission_period_id, university_name, faculty_name, semester_name, student_email, thesis_advisors,
        major, thesis_year, date_issued, publisher, document_type, language, description, extra_metadata, created_at)
        VALUES ($1, $2, $3, $2, $4, 'Reviewer One', $5, $6, $7, $8, $9, $10,
        'Ho Chi Minh City University of Technology', $11, $12, $13, 'Dr. Nguyen Van An',
        'Computer Science', $14, $14, 'Ho Chi Minh City University of Technology', 'Thesis', 'eng', $15, $16::jsonb, $17)`,
        [submissionId, item.title, `[DEMO] Luận văn minh họa - ${item.key}`, displayName,
          "This demonstration thesis supports UI testing of metadata, PDF preview and the academic approval workflow. It is sample data, not a real student thesis.",
          keywords, username, item.status, item.step, period.periodId, faculty.name, period.semesterName,
          `${username}@example.test`, String(year), "Seeded demonstration record. DSpace publication and signing have not been performed.",
          JSON.stringify({ demoSeed: "nhan-demo-v1" }), createdAt]);
      await client.query("INSERT INTO submission_authors (submission_id, user_id, sort_order) VALUES ($1, $2, 0)", [submissionId, username]);
      await client.query(`INSERT INTO reviews (id, submission_id, reviewer_id, decision, comment, sort_order, decided_at)
        VALUES ($1, $2, 'reviewer1', $3, $4, 0, $5)`, [id(`review:${item.key}`), submissionId, item.decision,
          item.decision === "reject" ? "Please clarify the methodology and include evaluation results before resubmitting."
            : item.decision === "approved" ? "Academic content approved for the demonstration." : null,
          item.decision === "pending" ? null : new Date(createdAt.getTime() + 86400000)]);
      if (item.status !== "draft") for (const [order, role, label] of [
        [1, "reviewer", "Academic review"], [2, "library_staff", "Library editing"], [3, "director", "Final approval"],
      ]) await client.query("INSERT INTO submission_steps (id, submission_id, sort_order, role, label) VALUES ($1, $2, $3, $4, $5)",
        [id(`step:${item.key}:${order}`), submissionId, order, role, label]);

      let sequence = 0;
      async function event(type, actor, role, payload = {}) {
        await client.query(`INSERT INTO submission_events (id, submission_id, actor_id, actor_role, event_type, payload, created_at)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
          [id(`event:${item.key}:${sequence}`), submissionId, actor, role, type,
            JSON.stringify({ ...payload, demo: true }), new Date(createdAt.getTime() + sequence++ * 3600000)]);
      }
      await event(item.status === "draft" ? "draft_created" : "submitted", username, "student", { title: item.title });
      if (item.decision === "approved") await event("reviewer_approved", "reviewer1", "reviewer", { comment: "Academic content approved for the demonstration." });
      if (["final", "returned", "archived"].includes(item.key)) {
        await event("metadata_updated", "library1", "library_staff", { changes: [{ field: "keywords", before: "thesis, repository", after: keywords }] });
        await event("library_staff_approved", "library1", "library_staff");
      }
      if (item.key === "returned") {
        await event("director_returned", "director1", "director", { comment: "Normalize the keywords and confirm the English title before final archival.", fromStep: 3, toStep: 2 });
        await event("status_changed", "director1", "system", { from: "approved", to: "reviewing", reason: "director_returned" });
      }
      if (item.key === "rejected") await event("reviewer_rejected", "reviewer1", "reviewer", { comment: "Please clarify the methodology and include evaluation results before resubmitting." });
      if (item.key === "archived") await event("director_archived", "director1", "director", { comment: "Portal archival demonstration; DSpace publication remains pending." });

      const directory = path.join(backendRoot, "uploads", "submissions", submissionId);
      const filePath = path.join(directory, "demo-thesis.pdf");
      await fs.mkdir(directory, { recursive: true });
      await fs.copyFile(path.join(backendRoot, "test", "fixtures", "thesis-valid.pdf"), filePath, constants.COPYFILE_EXCL)
        .catch(error => { if (error.code !== "EEXIST") throw error; });
      await client.query("INSERT INTO submission_files (id, submission_id, file_name, file_url, file_type) VALUES ($1, $2, 'demo-thesis.pdf', $3, 'thesis')",
        [id(`file:${item.key}`), submissionId, filePath]);
      created++;
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ database: (await client.query("SELECT current_database() AS name")).rows[0].name,
      createdSubmissions: created, preservedDemoSubmissions: skipped,
      counts: (await client.query(`SELECT 'users' AS entity, count(*)::int FROM users UNION ALL SELECT 'semesters', count(*)::int FROM semesters
        UNION ALL SELECT 'submission_periods', count(*)::int FROM submission_periods UNION ALL SELECT 'submissions', count(*)::int FROM submissions`)).rows,
      demoAccounts: cases.map(item => ({ username: `demo.${item.key}`, password: "student123", stage: item.key })) }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
