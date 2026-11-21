import { BadRequestException, Injectable } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import * as path from "node:path";
import {
  CUSTOM_GRAY_LOGO_FILE,
  CUSTOM_LOGO_FILE,
  customAssetsDir,
  PdfStampingService,
  SignatureStyleType,
  WATERMARK_TEXT_MAX_LENGTH,
} from "../reviews/pdf-stamping.service";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const STYLES: SignatureStyleType[] = ["margin_strips", "diagonal", "invisible"];

/** Logo watermark do quản trị viên tải lên và PDF xem trước kiểu watermark. */
@Injectable()
export class WatermarkAssetsService {
  constructor(private readonly stamping: PdfStampingService) {}

  async readLogo(variant: "color" | "gray"): Promise<{ bytes: Buffer; custom: boolean }> {
    const { path: logoPath, custom } = this.stamping.resolveWatermarkLogo(variant);
    if (!logoPath) throw new BadRequestException("No watermark logo is available");
    return { bytes: await readFile(logoPath), custom };
  }

  /** Lưu logo màu và bản xám (trình duyệt đã chuyển cả hai sang PNG). */
  async saveLogo(color?: Buffer, gray?: Buffer) {
    if (!color?.length || !gray?.length) {
      throw new BadRequestException("Both logo and grayLogo PNG files are required");
    }
    for (const bytes of [color, gray]) {
      if (bytes.length > MAX_LOGO_BYTES) throw new BadRequestException("Logo must be 2 MB or smaller");
      if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new BadRequestException("Logo must be a PNG image");
      try {
        // pdf-lib phải nhúng được ảnh, nếu không thì việc đóng dấu sẽ lỗi về sau
        await (await PDFDocument.create()).embedPng(bytes);
      } catch {
        throw new BadRequestException("Logo PNG could not be read");
      }
    }
    const dir = customAssetsDir();
    await mkdir(dir, { recursive: true });
    // Ghi file tạm rồi đổi tên để không bao giờ đọc phải file ghi dở
    for (const [name, bytes] of [[CUSTOM_LOGO_FILE, color], [CUSTOM_GRAY_LOGO_FILE, gray]] as const) {
      const target = path.join(dir, name);
      await writeFile(`${target}.tmp`, bytes);
      await rename(`${target}.tmp`, target);
    }
    return { custom: true };
  }

  async resetLogo() {
    for (const name of [CUSTOM_LOGO_FILE, CUSTOM_GRAY_LOGO_FILE]) {
      await unlink(path.join(customAssetsDir(), name)).catch(() => undefined);
    }
    return { custom: false };
  }

  async preview(input: { style?: string; text?: string; pages?: string }): Promise<Uint8Array> {
    const style = STYLES.includes(input.style as SignatureStyleType)
      ? (input.style as SignatureStyleType)
      : "margin_strips";
    const text = String(input.text ?? "").trim();
    if (text.length > WATERMARK_TEXT_MAX_LENGTH) {
      throw new BadRequestException(`Watermark text must be at most ${WATERMARK_TEXT_MAX_LENGTH} characters`);
    }
    return this.stamping.buildPreviewPdf(style, { watermarkText: text, watermarkPages: input.pages });
  }
}
