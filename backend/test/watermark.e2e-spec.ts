import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { deflateSync } from "zlib";
import { PDFDocument } from "pdf-lib";
import { closeApi, http, initApi, isRemote, login } from "./helpers";

// Uploaded logos go to a throwaway folder so a real custom logo is never touched.
const assetsDir = mkdtempSync(path.join(tmpdir(), "watermark-assets-"));
process.env.WATERMARK_ASSETS_DIR = assetsDir;

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Smallest valid RGBA PNG of the given size (solid red). */
function solidPng(width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 4, Buffer.from([200, 30, 30, 255]))]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function binary(res: any, callback: (error: Error | null, body: Buffer) => void) {
  const parts: Buffer[] = [];
  res.on("data", (part: Buffer) => parts.push(part));
  res.on("end", () => callback(null, Buffer.concat(parts)));
}

describe("Watermark settings API", () => {
  let admin: string;
  let student: string;

  beforeAll(async () => {
    await initApi();
    admin = (await login("admin1", "admin123")).token;
    student = (await login("student1", "student123")).token;
  });

  afterAll(async () => {
    if (!isRemote()) {
      await http().delete("/admin/signature/logo").set("Authorization", `Bearer ${admin}`);
    }
    await closeApi();
    rmSync(assetsDir, { recursive: true, force: true });
  });

  it("seeds a default watermark wording", async () => {
    const res = await http().get("/admin/settings").set("Authorization", `Bearer ${admin}`);
    expect(res.status).toBe(200);
    const text = res.body.find((row: { key: string }) => row.key === "signature_watermark_text");
    expect(text?.value).toBe("TRƯỜNG ĐẠI HỌC BÁCH KHOA - HCMUT");
  });

  it("rejects watermark wording longer than 120 characters", async () => {
    const res = await http()
      .patch("/admin/settings")
      .set("Authorization", `Bearer ${admin}`)
      .send({ settings: { signature_watermark_text: "X".repeat(121) } });
    expect(res.status).toBe(400);
  });

  it.each(["margin_strips", "diagonal", "invisible"])(
    "renders a %s preview with page 1 and the first logo page",
    async (style) => {
      const res = await http()
        .post("/admin/signature/preview")
        .set("Authorization", `Bearer ${admin}`)
        .send({ style, text: "THƯ VIỆN KIỂM THỬ", pages: "3,5" })
        .buffer(true)
        .parse(binary);
      expect(res.status).toBe(201);
      expect(res.headers["content-type"]).toContain("application/pdf");
      const pdf = await PDFDocument.load(res.body);
      expect(pdf.getPageCount()).toBe(2);
    }
  );

  it("renders a single page when no logo page is configured", async () => {
    const res = await http()
      .post("/admin/signature/preview")
      .set("Authorization", `Bearer ${admin}`)
      .send({ style: "diagonal", pages: "" })
      .buffer(true)
      .parse(binary);
    expect(res.status).toBe(201);
    expect((await PDFDocument.load(res.body)).getPageCount()).toBe(1);
  });

  it("rejects an unknown preview style", async () => {
    const res = await http()
      .post("/admin/signature/preview")
      .set("Authorization", `Bearer ${admin}`)
      .send({ style: "sideways" });
    expect(res.status).toBe(400);
  });

  it("keeps watermark endpoints admin-only", async () => {
    const anonymous = await http().post("/admin/signature/preview").send({});
    expect(anonymous.status).toBe(401);
    const asStudent = await http()
      .get("/admin/signature/logo")
      .set("Authorization", `Bearer ${student}`);
    expect(asStudent.status).toBe(403);
  });

  (isRemote() ? it.skip : it)("uploads a custom logo, rejects non-PNG files and restores the default", async () => {
    const initial = await http().get("/admin/signature/logo").set("Authorization", `Bearer ${admin}`);
    expect(initial.status).toBe(200);
    expect(initial.headers["x-watermark-logo"]).toBe("default");

    const png = solidPng(40, 20);
    const uploaded = await http()
      .post("/admin/signature/logo")
      .set("Authorization", `Bearer ${admin}`)
      .attach("logo", png, "logo.png")
      .attach("grayLogo", png, "logo-gray.png");
    expect(uploaded.status).toBe(201);
    expect(uploaded.body).toEqual({ custom: true });

    const custom = await http()
      .get("/admin/signature/logo?variant=gray")
      .set("Authorization", `Bearer ${admin}`)
      .buffer(true)
      .parse(binary);
    expect(custom.headers["x-watermark-logo"]).toBe("custom");
    expect(Buffer.compare(custom.body, png)).toBe(0);

    const notPng = await http()
      .post("/admin/signature/logo")
      .set("Authorization", `Bearer ${admin}`)
      .attach("logo", Buffer.from("%PDF-1.4 not an image"), "logo.png")
      .attach("grayLogo", png, "logo-gray.png");
    expect(notPng.status).toBe(400);

    const missing = await http()
      .post("/admin/signature/logo")
      .set("Authorization", `Bearer ${admin}`)
      .attach("logo", png, "logo.png");
    expect(missing.status).toBe(400);

    const reset = await http().delete("/admin/signature/logo").set("Authorization", `Bearer ${admin}`);
    expect(reset.status).toBe(200);
    const after = await http().get("/admin/signature/logo").set("Authorization", `Bearer ${admin}`);
    expect(after.headers["x-watermark-logo"]).toBe("default");
  });
});
