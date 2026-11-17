import { expect, test } from "@playwright/test";
import { apiBase, apiLogin, createStudent, deleteSubmission, loginUi, logoutUi, submitViaApi } from "./helpers";

async function reviewerApproves(id: string) {
  const reviewer = await apiLogin("reviewer1", "review123");
  const response = await fetch(`${apiBase()}/reviews/action`, {
    method: "POST", headers: { Authorization: `Bearer ${reviewer.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ submissionId: id, action: "approve" })
  });
  expect(response.ok).toBe(true);
}

test("Editor saves metadata and Final Editor returns, then archives with confirmation", async ({ page }) => {
  const student = await createStudent();
  const title = `Workspace ${Date.now()}`;
  const created = await submitViaApi(student, title);
  const revised = `Revised ${title}`;
  try {
    await reviewerApproves(created.id);
    await loginUi(page, "library1", "library123");
    await page.getByRole("row", { name: title }).first().getByRole("button", { name: "Detail" }).click();
    let dialog = page.getByRole("dialog");
    await expect(dialog.locator('canvas[data-rendered="true"]').first()).toBeVisible();
    expect(await dialog.locator('canvas[data-rendered="true"]').first().evaluate((element: HTMLCanvasElement) => {
      const pixels = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 180 && pixels[i + 1] < 180 && pixels[i + 2] < 180 && pixels[i + 3] > 0) return true;
      return false;
    })).toBe(true);
    await expect(dialog.getByText("Page 1 of 2", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(dialog.getByText("Page 2 of 2", { exact: true })).toBeVisible();
    await expect(dialog.locator('canvas[data-rendered="true"]').first()).toBeVisible();
    await dialog.getByRole("button", { name: "Previous page", exact: true }).click();
    await dialog.getByRole("button", { name: "Edit metadata" }).click();
    await dialog.getByLabel("Title (English)", { exact: true }).fill(revised);
    await dialog.getByLabel("Abstract", { exact: true }).fill("A corrected abstract for the institutional archive.");
    await page.route("**/api/submissions/*/metadata", route => route.fulfill({ status: 503, json: { message: "Unable to save metadata" } }));
    await dialog.getByRole("button", { name: "Save metadata" }).click();
    await expect(dialog.getByRole("alert").filter({ hasText: "Unable to save metadata" })).toBeVisible();
    await expect(dialog.getByLabel("Title (English)", { exact: true })).toHaveValue(revised);
    await page.unroute("**/api/submissions/*/metadata");
    await dialog.getByRole("button", { name: "Save metadata" }).click();
    await expect(dialog.getByRole("button", { name: "Edit metadata" })).toBeVisible();
    await dialog.getByRole("tab", { name: "Approval history" }).click();
    await expect(dialog.getByText("Metadata updated", { exact: true })).toBeVisible();
    await expect(dialog.locator(".history-event .metadata-change").filter({ hasText: "Abstract" })).toContainText("A corrected abstract for the institutional archive.");
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await page.getByRole("row", { name: revised }).first().getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.getByText("Passed library intake", { exact: true })).toBeVisible();
    await logoutUi(page);

    await loginUi(page, "director1", "director123");
    const row = page.getByRole("row", { name: revised }).first();
    await expect(row.getByRole("button", { name: "Reject", exact: true })).toHaveCount(0);
    await row.getByRole("button", { name: "Return to Editor" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Return to Editor", exact: true }).click();
    await expect(page.getByText("Return reason is required", { exact: true })).toBeVisible();
    await dialog.getByRole("textbox", { name: "Reason" }).fill("Normalize keywords before archival.");
    await page.route("**/api/reviews/director-action", route => route.fulfill({ status: 503, json: { message: "Unable to return to Editor" } }));
    await dialog.getByRole("button", { name: "Return to Editor", exact: true }).click();
    await expect(page.getByText("Unable to return to Editor", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Reason" })).toHaveValue("Normalize keywords before archival.");
    await page.unroute("**/api/reviews/director-action");
    await dialog.getByRole("button", { name: "Return to Editor", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await logoutUi(page);

    await loginUi(page, "library1", "library123");
    await page.getByRole("row", { name: revised }).first().getByRole("button", { name: "Detail" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "Approval history" }).click();
    await expect(dialog.getByText("Normalize keywords before archival.", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Accept", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await logoutUi(page);
    await loginUi(page, "director1", "director123");
    await page.getByRole("row", { name: revised }).first().getByRole("button", { name: "Commit to Archive" }).click();
    await expect(page.getByRole("dialog").getByText("Archive this submission in the portal? DSpace publication is a separate step.")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Commit to Archive", exact: true }).click();
    await expect(page.getByText(/Archived to period|Push to DSpace later/)).toBeVisible();
  } finally { await deleteSubmission(created.id); }
});

test("PDF failures can be retried and the mobile workspace supports Vietnamese", async ({ page }) => {
  const student = await createStudent();
  const title = `Preview ${Date.now()}`;
  const created = await submitViaApi(student, title);
  try {
    await reviewerApproves(created.id);
    await loginUi(page, "library1", "library123");
    await page.route("**/api/submissions/*/files/*/download", route => route.fulfill({ status: 404, json: { message: "File missing on server" } }));
    await page.getByRole("row", { name: title }).first().getByRole("button", { name: "Detail" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Unable to preview PDF", { exact: true })).toBeVisible();
    await page.unroute("**/api/submissions/*/files/*/download");
    await dialog.getByRole("button", { name: "Retry" }).click();
    await expect(dialog.locator('canvas[data-rendered="true"]').first()).toBeVisible();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "VI", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("row", { name: title }).first().getByRole("button", { name: "Chi tiết", exact: true }).click();
    await expect(dialog.getByRole("tab", { name: "Lịch sử phê duyệt", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Chỉnh sửa metadata", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  } finally { await deleteSubmission(created.id); }
});
