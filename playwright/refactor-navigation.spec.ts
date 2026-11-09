import { expect, test } from "@playwright/test";
import { createStudent, loginUi, logoutUi } from "./helpers";

test("Extracted administration and archive screens load and session state resets", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await loginUi(page, "admin1", "admin123");
  await page.getByPlaceholder("Search username or display name").fill("admin1");
  await expect(page.getByRole("row").filter({ hasText: "admin1" })).toHaveCount(
    1,
  );
  await page.getByRole("button", { name: "Create user", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Display name", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();

  for (const [tab, button] of [
    ["Manage roles", "Save permissions"],
    ["Approval workflow", "Save workflow"],
    ["User groups", "Create group"],
    ["System settings", "Save configuration"],
    ["Email configuration", "Save email configuration"],
  ]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await expect(
      page.getByRole("button", { name: button, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("tab", { name: "Submissions", exact: true }).click();
  await page
    .getByRole("tab", { name: "Submission fields", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add field", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add field", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();

  await page
    .getByRole("tab", { name: "Archive configuration", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Faculty archive configuration" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add faculty", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.getByRole("tab", { name: "DSpace settings", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save DSpace settings", exact: true }),
  ).toBeVisible();
  await logoutUi(page);

  const student = await createStudent();
  await loginUi(page, student.user.username, student.password);
  await expect(
    page.getByRole("button", { name: "Submit thesis", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Administration", exact: true }),
  ).toHaveCount(0);
  await logoutUi(page);
  await loginUi(page, "admin1", "admin123");
  await expect(
    page.getByPlaceholder("Search username or display name"),
  ).toHaveValue("");
  expect(errors).toEqual([]);
});
