import { expect, test } from "@playwright/test";
import { apiBase, apiLogin, chooseOption, createStudent, deleteSubmission, fillThesisForm, loginUi, logoutUi, pdfPath, submitViaApi } from "./helpers";

test("admin question modes control the student's red star, optional answer and visibility", async ({ page, browser }) => {
  const student = await createStudent();
  await loginUi(page, student.user.username, student.password);
  const emailLabel = page.locator('label[for="email"]');
  await expect(emailLabel).toHaveClass(/ant-form-item-required/);
  await page.getByLabel("Email", { exact: true }).fill("");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Email is required", { exact: true })).toBeVisible();
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const admin = await apiLogin("admin1", "admin123");
  const fields = await (await fetch(`${apiBase()}/admin/submission-form-fields`, { headers: { Authorization: `Bearer ${admin.token}` } })).json();
  const email = fields.find((field: { fieldKey: string }) => field.fieldKey === "email");
  try {
    await loginUi(adminPage, "admin1", "admin123");
    await adminPage.getByRole("tab", { name: "Submissions", exact: true }).click();
    await adminPage.getByRole("tab", { name: "Submission fields", exact: true }).click();
    for (const mode of ["Optional", "Hidden", "Mandatory"]) {
      await adminPage.locator('.ant-select[aria-label="Question mode for Email"]').click();
      const saved = adminPage.waitForResponse(response => response.url().endsWith(`/admin/submission-form-fields/${email.id}`) && response.request().method() === "PATCH");
      await adminPage.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)").getByText(mode, { exact: true }).click();
      expect((await saved).ok()).toBe(true);
      await page.reload();
      if (mode === "Hidden") {
        await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
      } else {
        await expect(emailLabel).toBeVisible();
        if (mode === "Mandatory") await expect(emailLabel).toHaveClass(/ant-form-item-required/);
        else {
          await expect(emailLabel).not.toHaveClass(/ant-form-item-required/);
          await page.getByLabel("Email", { exact: true }).fill("");
          await page.getByRole("checkbox", { name: "Lần 1", exact: true }).check();
          const checklist = page.locator(".ant-form-item").filter({ has: page.locator("label", { hasText: "Thesis components" }) });
          for (const checkbox of await checklist.getByRole("checkbox").all()) await checkbox.check();
          await page.getByRole("button", { name: "Next", exact: true }).click();
          await expect(page.getByLabel("Advisor 2 (full name only)")).toBeVisible();
        }
      }
    }
  } finally {
    await fetch(`${apiBase()}/admin/submission-form-fields/${email.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${admin.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ mode: email.mode }) });
    await adminContext.close();
  }
});

test("a selected PDF renders inline before submission, survives step navigation and has a mobile layout", async ({ page }) => {
  const student = await createStudent();
  await loginUi(page, student.user.username, student.password);
  await fillThesisForm(page, `Local preview ${Date.now()}`);
  const canvas = page.locator('canvas[data-rendered="true"]');
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(canvas).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "test-results/submission-form-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "test-results/submission-form-desktop.png", fullPage: true });
});

test("the form keeps admin faculty overrides and per-submission review switches", async ({ page }) => {
  test.setTimeout(60000);
  const student = await createStudent();
  const title = `Admin form integration ${Date.now()}`;
  let submissionId: string | undefined;
  try {
    await loginUi(page, "admin1", "admin123");
    await page.getByRole("tab", { name: "Submissions", exact: true }).click();
    await page.getByRole("button", { name: "Create submission", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await chooseOption(page, "Submitting student", student.user.username);
    await dialog.getByRole("checkbox", { name: "Lần 1", exact: true }).check();
    const checklist = dialog.locator(".ant-form-item").filter({ has: page.locator('label[for="components"]') });
    await expect(checklist.getByRole("checkbox")).toHaveCount(13);
    for (const checkbox of await checklist.getByRole("checkbox").all()) await checkbox.check();
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
    await expect(dialog.getByText("Review steps for this submission", { exact: true })).toBeVisible();
    await dialog.getByRole("switch").first().click();
    await expect(dialog.getByLabel("Review assignments", { exact: true })).toBeDisabled();
    await dialog.getByLabel("Faculty", { exact: true }).fill("Other");
    await page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)").getByText("Other (enter faculty name)", { exact: true }).click();
    await dialog.getByLabel("Faculty name", { exact: true }).fill("Admin integration faculty");
    await expect(dialog.getByLabel("Semester", { exact: true })).toHaveCount(0);
    await expect(dialog.getByLabel("Submission period", { exact: true })).toHaveCount(0);
    await dialog.getByLabel("Thesis title (Vietnamese)").fill("Luận văn kiểm tra tích hợp");
    await dialog.getByLabel("Thesis title (English)").fill(title);
    await dialog.getByLabel("Advisor 1 (full name only)").fill("Advisor One");
    await dialog.getByLabel("Reviewer 1 (full name only)").fill("Reviewer One");
    await dialog.getByLabel("Major", { exact: true }).fill("Computer Science");
    await dialog.locator("input[type=file]").setInputFiles(pdfPath);
    await expect(dialog.locator('canvas[data-rendered="true"]')).toBeVisible();
    const submitted = page.waitForResponse(response => response.url().endsWith("/api/submissions") && response.request().method() === "POST", { timeout: 15000 });
    await dialog.getByRole("button", { name: "Submit thesis", exact: true }).click();
    const response = await submitted;
    const payload = await response.json();
    submissionId = payload.id;
    expect({ status: response.status(), message: payload.message }).toEqual({ status: 201, message: undefined });
    const rows = await (await fetch(`${apiBase()}/submissions/student/${student.user.id}`, { headers: { Authorization: `Bearer ${student.token}` } })).json();
    const record = rows.find((item: { id: string }) => item.id === submissionId);
    expect(record.faculty_name).toBe("Admin integration faculty");
    expect(record.current_step_role).toBe("library_staff");
  } finally { if (submissionId) await deleteSubmission(submissionId); }
});

test("student, reviewer, library staff, director and admin all render the submitted PDF", async ({ page }) => {
  const student = await createStudent();
  const title = `All role preview ${Date.now()}`;
  const submission = await submitViaApi(student, title);
  try {
    const accounts = [[student.user.username, student.password], ["reviewer1", "review123"], ["library1", "library123"], ["director1", "director123"], ["admin1", "admin123"]];
    for (const [username, password] of accounts) {
      await loginUi(page, username, password);
      if (username !== student.user.username) {
        if (username === "admin1") await page.getByRole("tab", { name: "Submissions", exact: true }).click();
        const row = page.getByRole("row", { name: title }).first();
        if (username === "reviewer1") await row.getByRole("button", { name: "Detail", exact: true }).click();
        else await row.click();
      }
      await expect(page.locator('canvas[data-rendered="true"]').first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Download", exact: true }).first()).toBeEnabled();
      const dialog = page.getByRole("dialog");
      if (await dialog.isVisible()) await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await logoutUi(page);
    }
  } finally { await deleteSubmission(submission.id); }
});
