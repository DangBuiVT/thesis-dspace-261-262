import { expect, test, type Locator } from "@playwright/test";
import {
  createStudent,
  deleteSubmission,
  loginUi,
  submitViaApi,
} from "./helpers";

// Playwright normally hides scrollbars, which concealed the desktop resize loop.
test.use({
  launchOptions: {
    ignoreDefaultArgs: ["--hide-scrollbars"],
    args: ["--disable-features=OverlayScrollbar"],
  },
});

async function expectStablePage(canvas: Locator) {
  await expect(canvas).toHaveAttribute("data-rendered", "true");
  await expect(canvas).toBeVisible();
  await expect
    .poll(
      () =>
        canvas.evaluate(async (element: HTMLCanvasElement) => {
          const initial = element.getBoundingClientRect();
          for (let frame = 0; frame < 30; frame++) {
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            );
            const bounds = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            if (
              element.dataset.rendered !== "true" ||
              style.visibility === "hidden" ||
              style.display === "none" ||
              Math.abs(bounds.width - initial.width) > 1 ||
              bounds.height === 0
            ) {
              return { stable: false, frame };
            }
          }
          const pixels = element
            .getContext("2d")!
            .getImageData(0, 0, element.width, element.height).data;
          for (let index = 0; index < pixels.length; index += 4) {
            if (
              pixels[index] < 180 &&
              pixels[index + 1] < 180 &&
              pixels[index + 2] < 180 &&
              pixels[index + 3] > 0
            )
              return { stable: true, nonblank: true };
          }
          return { stable: true, nonblank: false };
        }),
      { timeout: 10000 },
    )
    .toMatchObject({ stable: true, nonblank: true });
}

test("PDF stays rendered with classic scrollbars, tab changes, resizing and reopening", async ({
  page,
}) => {
  const student = await createStudent();
  const title = `Stable PDF ${Date.now()}`;
  const submission = await submitViaApi(student, title);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await loginUi(page, "reviewer1", "review123");
    await page.addStyleTag({
      content:
        ".pdf-canvas-container::-webkit-scrollbar { width: 17px; height: 17px; }",
    });
    const row = page.getByRole("row", { name: title }).first();
    const dialog = page.getByRole("dialog");
    const canvas = dialog.locator(".ant-tabs-tabpane-active canvas");
    await row.getByRole("button", { name: "Detail", exact: true }).click();
    await expectStablePage(canvas);
    await dialog
      .getByRole("button", { name: "Next page", exact: true })
      .click();
    await expect(
      dialog.getByText("Page 2 of 2", { exact: true }),
    ).toBeVisible();
    await expectStablePage(canvas);
    for (const tab of ["Files", "Metadata", "Files", "Metadata"]) {
      await dialog.getByRole("tab", { name: tab, exact: true }).click();
      await expectStablePage(canvas);
    }
    for (const width of [1024, 640, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expectStablePage(canvas);
    }
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await row.getByRole("button", { name: "Detail", exact: true }).click();
    await expectStablePage(canvas);
    expect(errors).toEqual([]);
  } finally {
    await deleteSubmission(submission.id);
  }
});
