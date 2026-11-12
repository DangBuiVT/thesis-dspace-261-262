// Local-only integration evidence. Requires the API on 3001, Vite on 5174,
// a prepared thesis_test database, and Mailpit on 8025/1025.
const { chromium } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../..");
const output = path.join(__dirname, "screenshots");
const evidence = path.join(__dirname, "evidence");
const api = "http://127.0.0.1:3001";
const baselineCommit = "4f7a73df";
fs.mkdirSync(output, { recursive: true });
fs.mkdirSync(evidence, { recursive: true });
let browser, baseline, admin, submission;
const recorded = [];

async function request(endpoint, token, body, method = "POST") {
  const response = await fetch(`${api}${endpoint}`, {
    method: body === undefined ? "GET" : method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body)
  });
  const payload = await response.json();
  assert(response.ok, `${method} ${endpoint}: ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}
async function login(username, password) { return (await request("/auth/login", undefined, { username, password })).access_token; }
async function waitFor(url) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`Service not ready: ${url}`);
}
async function signedPage(username, password, port = 5174, width = 1440, height = 1000) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(() => localStorage.setItem("thesis_portal_lang", "en"));
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}`);
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).waitFor();
  return page;
}
async function screenshot(page, name, target = page) {
  await page.waitForFunction(() => !document.querySelector(".ant-message-notice"));
  if (name === "after-mobile-vi.png") await page.screenshot({ path: path.join(output, name), fullPage: false });
  else await target.screenshot({ path: path.join(output, name), ...(target === page ? { fullPage: true } : {}) });
  recorded.push(name);
}

(async () => {
  await waitFor(`${api}/health`); await waitFor("http://127.0.0.1:5174"); await waitFor("http://127.0.0.1:8025/api/v1/info");
  admin = await login("admin1", "admin123");
  await request("/admin/settings", admin, { settings: { email_enabled: "true", smtp_host: "127.0.0.1", smtp_port: "1025", smtp_secure: "false", smtp_user: "", smtp_password: "", smtp_from: "Thesis Portal <noreply@localhost>" } }, "PATCH");
  const faculties = await request("/archive-config/faculties", admin);
  const faculty = faculties.find(item => item.name === "Automation Faculty");
  assert(faculty, "Run the local test setup to create Automation Faculty first");
  const username = `nhan-demo-${Date.now().toString(36)}`;
  const password = "demo-local-123";
  await request("/admin/users", admin, { username, password, displayName: "Nhan UI Demo Student", role: "student", facultyId: faculty.id });
  const student = await login(username, password);
  const semesters = await request(`/archive/faculties/${faculty.id}/semesters`, student);
  const semester = semesters.find(item => item.name === "Automation Semester") || semesters[0];
  const periods = await request(`/archive/submission-periods?facultyId=${faculty.id}&semesterId=${semester.id}`, student);
  const period = periods.find(item => item.name === "Automation Period") || periods[0];
  const title = `Institutional repository workflows: ${username}`;
  const form = new FormData();
  const fields = { titleVi: "Quy trình lưu chiểu luận văn điện tử", titleEn: title, thesisAdvisors: "Reviewer One", major: "Computer Science", thesisYear: "2026", dateIssued: "2026", publisher: "Ho Chi Minh City University of Technology", documentType: "Thesis", language: "vie", abstract: "An original abstract about the thesis deposit workflow.", description: "A separate description that must remain unchanged during abstract editing.", studentId: username, submissionPeriodId: period.id, authorIds: JSON.stringify([username]), reviewerIds: JSON.stringify(["reviewer1"]) };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  form.set("thesisFile", new Blob([fs.readFileSync(path.join(root, "backend/test/fixtures/thesis-valid.pdf"))], { type: "application/pdf" }), "thesis-demo.pdf");
  submission = await request("/submissions", student, form);
  const reviewer = await login("reviewer1", "review123");
  await request("/reviews/action", reviewer, { submissionId: submission.id, action: "approve" });
  browser = await chromium.launch({ headless: true });

  // Reconstruct only tracked original frontend files in an ignored dependency cache.
  const baselineRoot = path.join(root, "frontend/node_modules/.cache/nhan-ui-baseline");
  const tracked = execFileSync("git", ["ls-tree", "-r", "--name-only", baselineCommit, "--", "frontend"], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/);
  for (const file of tracked) {
    if (!file.startsWith("frontend/") || file.includes("/docs/")) continue;
    const target = path.join(baselineRoot, file.slice("frontend/".length));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, execFileSync("git", ["show", `${baselineCommit}:${file}`], { cwd: root, maxBuffer: 8 * 1024 * 1024 }));
  }
  baseline = spawn(process.execPath, [path.join(root, "frontend/node_modules/vite/bin/vite.js"), baselineRoot, "--port", "5175", "--host", "127.0.0.1"], {
    cwd: root, env: { ...process.env, API_PROXY_TARGET: api }, stdio: "ignore", windowsHide: true
  });
  await waitFor("http://127.0.0.1:5175");
  let page = await signedPage("library1", "library123", 5175);
  await page.getByRole("row", { name: title }).first().getByRole("button", { name: "Detail", exact: true }).click();
  await screenshot(page, "before-editor.png", page.locator(".ant-modal-content"));
  await page.context().close();

  page = await signedPage("library1", "library123");
  await page.getByRole("row", { name: title }).first().getByRole("button", { name: "Detail", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.locator('canvas[data-rendered="true"]').first().waitFor();
  await screenshot(page, "after-editor.png", page.locator(".ant-modal-content"));
  await dialog.getByRole("button", { name: "Edit metadata" }).click();
  await dialog.getByLabel("Abstract", { exact: true }).fill("A corrected abstract describing a complete, auditable thesis review workflow.");
  await dialog.getByLabel("Keywords", { exact: true }).fill("DSpace, thesis, review workflow");
  await dialog.getByRole("button", { name: "Save metadata" }).click();
  await dialog.getByRole("button", { name: "Edit metadata" }).waitFor();
  await dialog.getByRole("tab", { name: "Approval history" }).click();
  await dialog.getByText("Metadata updated", { exact: true }).waitFor();
  await screenshot(page, "after-history.png", page.locator(".ant-modal-content"));
  await dialog.getByRole("button", { name: "Accept", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.context().close();

  page = await signedPage("director1", "director123");
  await page.getByRole("row", { name: title }).first().getByRole("button", { name: "Detail", exact: true }).click();
  await page.getByRole("dialog").locator('canvas[data-rendered="true"]').first().waitFor();
  await screenshot(page, "after-final-editor.png", page.locator(".ant-modal-content"));
  await page.getByRole("dialog").getByRole("button", { name: "Return to Editor", exact: true }).click();
  const returnDialog = page.getByRole("dialog").filter({ hasText: "Explain what the Editor needs to correct" });
  await returnDialog.getByRole("textbox", { name: "Reason" }).fill("Please normalize the keywords before archival.");
  await returnDialog.getByRole("button", { name: "Return to Editor", exact: true }).click();
  await returnDialog.waitFor({ state: "hidden" });
  await page.context().close();

  page = await signedPage("library1", "library123");
  await page.getByRole("button", { name: "VI", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("row", { name: title }).first().getByRole("button", { name: "Chi tiết", exact: true }).click();
  await page.getByRole("dialog").locator('canvas[data-rendered="true"]').first().waitFor();
  await screenshot(page, "after-mobile-vi.png", page.locator(".ant-modal-content"));
  await page.context().close();
  const library = await login("library1", "library123");
  await request(`/submissions/${submission.id}/metadata`, library, { keywords: "DSpace; thesis; workflow" }, "PATCH");
  await request("/reviews/library-action", library, { submissionId: submission.id, action: "approve" });
  const director = await login("director1", "director123");
  const archived = await request("/reviews/director-action", director, { submissionId: submission.id, action: "archive" });
  assert.equal(archived.dspaceDeferred, true);
  page = await signedPage(username, password);
  await page.getByText("Archived in portal", { exact: true }).first().waitFor();
  await screenshot(page, "after-student.png");
  await page.context().close();

  // Capture only messages about this demonstration; never export tokens or full mail bodies.
  const deadline = Date.now() + 15000;
  let mails = [];
  do {
    const response = await fetch(`http://127.0.0.1:8025/api/v1/search?query=${encodeURIComponent(username)}`);
    const results = await response.json(); mails = results.messages || [];
    if (mails.length >= 3) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  } while (Date.now() < deadline);
  const inboxContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await inboxContext.newPage(); await page.goto("http://127.0.0.1:8025");
  await page.getByText(/Thesis Portal/).first().waitFor();
  await screenshot(page, "mailpit-inbox.png");
  await inboxContext.close();
  const designContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  page = await designContext.newPage(); await page.goto(pathToFileURL(path.join(__dirname, "wireframes.html")).href);
  await screenshot(page, "wireframes.png");
  for (let i = 0; i < 3; i++) await screenshot(page, `wireframe-0${i + 1}.png`, page.locator(".frame").nth(i));
  await page.goto(pathToFileURL(path.join(__dirname, "diagrams/use-cases.svg")).href);
  await page.locator("svg").screenshot({ path: path.join(__dirname, "diagrams/use-cases.png") });
  const history = await request(`/submissions/${submission.id}/history`, student);
  const list = await request(`/submissions/student/${username}`, student);
  const current = list.find(item => item.id === submission.id);
  assert.equal(current.description, fields.description);
  assert.equal(current.reviews[0].decision, "approved");
  assert.equal(current.status, "archived");
  const proof = {
    capturedAt: new Date().toISOString(), timezone: "Asia/Ho_Chi_Minh", baselineCommit,
    target: "Local NestJS + PostgreSQL + Vite + Mailpit", screenshots: recorded,
    checks: { archivedInPortal: true, dspaceDeferred: true, descriptionPreserved: true, academicApprovalPreserved: true,
      metadataChangeRecorded: history.some(event => event.eventType === "metadata_updated"),
      returnRecorded: history.some(event => event.eventType === "director_returned") },
    emails: mails.map(mail => ({ subject: mail.Subject, to: mail.To?.map(item => item.Address), created: mail.Created })),
    limits: ["Actual PAdES signing is not implemented", "Live DSpace publication is not verified", "Mailpit confirms local SMTP capture only"]
  };
  fs.writeFileSync(path.join(evidence, "demo-evidence.json"), JSON.stringify(proof, null, 2));
  console.log(`Captured ${recorded.length} screenshots and ${mails.length} demonstration email summaries.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (admin) {
    try { await request("/admin/settings", admin, { settings: { email_enabled: "false" } }, "PATCH"); } catch {}
  }
  await browser?.close(); baseline?.kill();
});
