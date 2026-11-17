import { expect, test } from "@playwright/test";
import {
  createStudent,
  deleteSubmission,
  loginUi,
  logoutUi,
  submitViaApi,
} from "./helpers";

test("Home, My tasks and logo links navigate to the role dashboard and support browser history", async ({
  page,
}) => {
  const student = await createStudent();
  const title = `Home navigation ${Date.now()}`;
  const submission = await submitViaApi(student, title);
  try {
    await loginUi(page, "reviewer1", "review123");
    const row = page.getByRole("row", { name: title }).first();
    const dialog = page.getByRole("dialog");
    await row.getByRole("button", { name: "Detail", exact: true }).click();
    await expect(
      dialog.getByRole("link", { name: "Home", exact: true }),
    ).toHaveAttribute("href", "/home");
    await expect(
      dialog.getByRole("link", { name: "My tasks", exact: true }),
    ).toHaveAttribute("href", "/home");
    await dialog.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(dialog).toBeHidden();
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Detail", exact: true }).click();
    await dialog.getByRole("link", { name: "My tasks", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(row).toBeVisible();

    await page.goto("/?navigation=logo");
    const logoLink = page
      .getByRole("banner")
      .getByRole("link", { name: "Home", exact: true });
    await expect(logoLink).toHaveAttribute("href", "/home");
    await logoLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/home$/);
    await expect(row).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\?navigation=logo$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/home$/);
    await page.reload();
    await expect(row).toBeVisible();

    await page.getByRole("button", { name: "VI", exact: true }).click();
    await row.getByRole("button", { name: "Chi tiết", exact: true }).click();
    await expect(
      dialog.getByRole("link", { name: "Trang chủ", exact: true }),
    ).toHaveAttribute("href", "/home");
    await dialog
      .getByRole("link", { name: "Công việc của tôi", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: "Trang chủ", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await logoutUi(page);

    await loginUi(page, student.user.username, student.password);
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Home", exact: true })
      .click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(
      page.getByText("My submissions", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Administration", exact: true }),
    ).toHaveCount(0);
  } finally {
    await deleteSubmission(submission.id);
  }
});

test("Direct /home navigation without a session shows login", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("thesis_portal_lang", "en"),
  );
  await page.goto("/home");
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Home", exact: true })
    .click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeVisible();
});
