import { Injectable } from "@nestjs/common";
import { PDFDocument, PDFFont, PDFImage, rgb, degrees, StandardFonts } from "pdf-lib";
import * as fontkit from "@pdf-lib/fontkit";
import type { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { createPgPool } from "../users/db-pool";

export type SignatureStyleType = "margin_strips" | "diagonal" | "invisible";

export interface StampingResult {
  pdfBytes: Uint8Array;
  totalPages: number;
  watermarkPagesApplied: number[];
  watermarkPagesMissing: number[];
}

export interface StampingMetadata {
  serial?: string;
  signedAt?: string;
  watermarkPages?: string | number[];
  enableLogoWatermark?: boolean;
  /** Chữ watermark; bỏ trống thì đọc system_settings.signature_watermark_text, rồi tới mặc định. */
  watermarkText?: string;
}

/** Chữ watermark mặc định (dải 2 bên lề và dải chéo) — cần font Unicode (DejaVuSans-Bold.ttf). */
export const DEFAULT_WATERMARK_TEXT = "TRƯỜNG ĐẠI HỌC BÁCH KHOA - HCMUT";
export const WATERMARK_TEXT_MAX_LENGTH = 120;

/** Logo do quản trị viên tải lên (bản màu cho logo giữa trang, bản xám cho dải lề). */
export const CUSTOM_LOGO_FILE = "watermark-logo.png";
export const CUSTOM_GRAY_LOGO_FILE = "watermark-logo-gray.png";
export function customAssetsDir(): string {
  // WATERMARK_ASSETS_DIR cho phép test dùng thư mục riêng, không đụng logo thật
  return path.resolve(process.env.WATERMARK_ASSETS_DIR || path.join(process.cwd(), "uploads", "assets"));
}

// Một pool dùng chung cho mọi bản PdfStampingService (service được khai báo ở nhiều module).
let sharedPool: Pool | null = null;
function settingsPool(): Pool {
  if (!sharedPool) sharedPool = createPgPool();
  return sharedPool;
}

/** Bỏ dấu tiếng Việt khi phải dùng Helvetica (không có glyph có dấu). */
function toAscii(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7e]/g, "");
}

@Injectable()
export class PdfStampingService {
  /** Màu xám dùng chung cho chữ và logo ở dải 2 bên lề. */
  private readonly marginGray = rgb(0.35, 0.35, 0.35);
  private readonly marginOpacity = 0.22;

  /**
   * Helper to resolve the path of hcmut_nobg.png (hoặc bản xám hcmut_gray.png)
   */
  private resolveLogoPath(fileName = "hcmut_nobg.png"): string | null {
    const candidatePaths = [
      path.resolve(__dirname, "../assets", fileName),
      path.resolve(__dirname, "../../src/assets", fileName),
      path.resolve(process.cwd(), "src/assets", fileName),
      path.resolve(process.cwd(), "uploads/assets", fileName),
      path.resolve(process.cwd(), fileName),
      path.resolve(process.cwd(), "..", fileName),
    ];

    for (const p of candidatePaths) {
      if (existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  /** Logo tải lên được ưu tiên; không có thì dùng logo HCMUT mặc định. */
  resolveWatermarkLogo(variant: "color" | "gray"): { path: string | null; custom: boolean } {
    const customPath = path.join(customAssetsDir(), variant === "gray" ? CUSTOM_GRAY_LOGO_FILE : CUSTOM_LOGO_FILE);
    if (existsSync(customPath)) return { path: customPath, custom: true };
    return { path: this.resolveLogoPath(variant === "gray" ? "hcmut_gray.png" : "hcmut_nobg.png"), custom: false };
  }

  /** Chữ watermark: tham số truyền vào → system_settings → mặc định. */
  async resolveWatermarkText(override?: string): Promise<string> {
    const direct = String(override ?? "").trim();
    if (direct) return direct.slice(0, WATERMARK_TEXT_MAX_LENGTH);
    try {
      const result = await settingsPool().query<{ value: string }>(
        `SELECT value FROM system_settings WHERE key = 'signature_watermark_text' LIMIT 1`
      );
      const stored = String(result.rows[0]?.value ?? "").trim();
      if (stored) return stored.slice(0, WATERMARK_TEXT_MAX_LENGTH);
    } catch (e) {
      console.error("Failed to read signature_watermark_text, using default:", e);
    }
    return DEFAULT_WATERMARK_TEXT;
  }

  /**
   * Parse target pages from string (e.g. "10" or "10, 15, 20" or "10-12")
   */
  parsePageNumbers(pagesInput?: string | number[] | null): number[] {
    if (!pagesInput) return [];
    if (Array.isArray(pagesInput)) {
      return Array.from(new Set(pagesInput.filter((n) => typeof n === "number" && n > 0)));
    }
    const cleanStr = String(pagesInput).trim();
    if (!cleanStr) return [];

    const pageSet = new Set<number>();
    const tokens = cleanStr.split(/[,;\s]+/);
    for (const token of tokens) {
      if (!token) continue;
      if (token.includes("-")) {
        const [startStr, endStr] = token.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          for (let p = start; p <= end; p++) {
            pageSet.add(p);
          }
        }
      } else {
        const p = parseInt(token, 10);
        if (!isNaN(p) && p > 0) {
          pageSet.add(p);
        }
      }
    }
    return Array.from(pageSet).sort((a, b) => a - b);
  }

  /**
   * Đóng dấu chữ ký số điện tử lên file PDF và chèn watermark bí mật nếu có cấu hình
   */
  async stampPdfFile(
    filePath: string,
    style: SignatureStyleType = "margin_strips",
    metadata?: StampingMetadata
  ): Promise<Uint8Array> {
    const result = await this.stampPdfFileDetailed(filePath, style, metadata);
    return result.pdfBytes;
  }

  /**
   * Chi tiết thông tin stamp bao gồm warning và danh sách trang áp dụng
   */
  async stampPdfFileDetailed(
    filePath: string,
    style: SignatureStyleType = "margin_strips",
    metadata?: StampingMetadata
  ): Promise<StampingResult> {
    return this.stampPdfBytesDetailed(await readFile(filePath), style, metadata);
  }

  async stampPdfBytesDetailed(
    existingPdfBytes: Uint8Array,
    style: SignatureStyleType = "margin_strips",
    metadata?: StampingMetadata
  ): Promise<StampingResult> {
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    // 1. CHÈN CHỮ KÝ SỐ TOÀN BỘ CÁC TRANG (nếu style !== invisible)
    if (style !== "invisible") {
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const watermarkText = await this.resolveWatermarkText(metadata?.watermarkText);

      // Font tiếng Việt cho chữ watermark (nhúng 1 lần, dùng lại cho mọi trang)
      let textFont: PDFFont = helveticaBold;
      let text = toAscii(watermarkText) || toAscii(DEFAULT_WATERMARK_TEXT);
      const fontPath = this.resolveLogoPath("DejaVuSans-Bold.ttf");
      if (fontPath) {
        try {
          pdfDoc.registerFontkit(fontkit);
          textFont = await pdfDoc.embedFont(await readFile(fontPath), { subset: true });
          text = watermarkText;
        } catch (e) {
          console.error("Failed to embed Unicode font for watermark text:", e);
        }
      }

      // Logo xám cho dải 2 bên lề
      let grayLogo: PDFImage | null = null;
      if (style === "margin_strips") {
        const grayLogoPath = this.resolveWatermarkLogo("gray").path;
        if (grayLogoPath) {
          try {
            grayLogo = await pdfDoc.embedPng(await readFile(grayLogoPath));
          } catch (e) {
            console.error("Failed to embed gray logo for margin strips:", e);
          }
        }
      }

      for (const page of pages) {
        const { width, height } = page.getSize();

        if (style === "margin_strips") {
          // Dải lề: [logo xám] + chữ watermark, cùng màu xám & độ mờ
          const marginOffset = 30; // khoảng cách đường baseline tới mép trang
          // Thu nhỏ chữ nếu cả cụm dài hơn 90% chiều cao trang
          const measure = (size: number) =>
            (grayLogo ? size * 1.6 + size * 0.5 : 0) + textFont.widthOfTextAtSize(text, size);
          let fontSize = 15;
          const maxLength = height * 0.9;
          if (measure(fontSize) > maxLength) fontSize = Math.max(6, (fontSize * maxLength) / measure(fontSize));
          const textWidth = textFont.widthOfTextAtSize(text, fontSize);
          const capHeight = fontSize * 0.72;
          const logoSize = fontSize * 1.6; // cạnh dọc theo dải
          const logoThick = grayLogo ? (grayLogo.height / grayLogo.width) * logoSize : 0; // cạnh vuông góc dải
          const gap = grayLogo ? fontSize * 0.5 : 0;
          const groupLength = (grayLogo ? logoSize : 0) + gap + textWidth;

          // ── Dải lề trái: đọc từ dưới lên (xoay 90°), logo ở dưới rồi tới chữ ──
          const leftStart = height / 2 - groupLength / 2;
          const leftTextCenterX = marginOffset - capHeight / 2;
          if (grayLogo) {
            // xoay 90°: chiều rộng ảnh chạy theo +y, chiều cao ảnh chạy theo -x
            page.drawImage(grayLogo, {
              x: leftTextCenterX + logoThick / 2,
              y: leftStart,
              width: logoSize,
              height: logoThick,
              opacity: this.marginOpacity,
              rotate: degrees(90),
            });
          }
          page.drawText(text, {
            x: marginOffset,
            y: leftStart + (grayLogo ? logoSize + gap : 0),
            size: fontSize,
            font: textFont,
            color: this.marginGray,
            opacity: this.marginOpacity,
            rotate: degrees(90),
          });

          // ── Dải lề phải: đọc từ trên xuống (xoay -90°), logo ở trên rồi tới chữ ──
          const rightStart = height / 2 + groupLength / 2;
          const rightBaseX = width - marginOffset;
          const rightTextCenterX = rightBaseX + capHeight / 2;
          if (grayLogo) {
            // xoay -90°: chiều rộng ảnh chạy theo -y, chiều cao ảnh chạy theo +x
            page.drawImage(grayLogo, {
              x: rightTextCenterX - logoThick / 2,
              y: rightStart,
              width: logoSize,
              height: logoThick,
              opacity: this.marginOpacity,
              rotate: degrees(-90),
            });
          }
          page.drawText(text, {
            x: rightBaseX,
            y: rightStart - (grayLogo ? logoSize + gap : 0),
            size: fontSize,
            font: textFont,
            color: this.marginGray,
            opacity: this.marginOpacity,
            rotate: degrees(-90),
          });
        } else if (style === "diagonal") {
          // Căn giữa tuyệt đối cả 2 dòng theo góc nghiêng 45 độ tại tâm trang giấy
          const angle = 45;
          const rad = (angle * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);

          const text2 = metadata?.serial ? `CERT SERIAL: ${metadata.serial}` : "";

          // Chữ dài thì thu nhỏ để không vượt quá 85% đường chéo trang
          let fontSize1 = Math.min(width, height) * 0.034;
          const maxDiagonal = Math.hypot(width, height) * 0.85;
          const naturalWidth = textFont.widthOfTextAtSize(text, fontSize1);
          if (naturalWidth > maxDiagonal) fontSize1 = Math.max(6, (fontSize1 * maxDiagonal) / naturalWidth);
          const fontSize2 = fontSize1 * 0.62;

          const w1 = textFont.widthOfTextAtSize(text, fontSize1);
          const w2 = text2 ? helvetica.widthOfTextAtSize(text2, fontSize2) : 0;

          const lineGap = fontSize1 * 0.55;
          const v1 = text2 ? (lineGap + fontSize2) / 2 : 0;
          const v2 = text2 ? -(fontSize1 + lineGap) / 2 : 0;

          const baselineV1 = v1 - fontSize1 * 0.35;
          const x1 = width / 2 - (w1 / 2) * cos + baselineV1 * sin;
          const y1 = height / 2 - (w1 / 2) * sin - baselineV1 * cos;
          page.drawText(text, {
            x: x1,
            y: y1,
            size: fontSize1,
            font: textFont,
            color: rgb(0, 0.2, 0.4),
            opacity: 0.12,
            rotate: degrees(angle),
          });

          if (text2) {
            const baselineV2 = v2 - fontSize2 * 0.35;
            const x2 = width / 2 - (w2 / 2) * cos + baselineV2 * sin;
            const y2 = height / 2 - (w2 / 2) * sin - baselineV2 * cos;
            page.drawText(text2, {
              x: x2,
              y: y2,
              size: fontSize2,
              font: helvetica,
              color: rgb(0, 0.2, 0.4),
              opacity: 0.12,
              rotate: degrees(angle),
            });
          }
        }
      }
    }

    // 2. CHÈN WATERMARK LOGO MỜ 0.22 OPACITY Ở GIỮA CÁC TRANG CHỈ ĐỊNH
    const watermarkPagesApplied: number[] = [];
    const watermarkPagesMissing: number[] = [];

    const isLogoEnabled = metadata?.enableLogoWatermark !== false;
    const requestedTargetPages = this.parsePageNumbers(metadata?.watermarkPages);

    if (isLogoEnabled && requestedTargetPages.length > 0) {
      const logoPath = this.resolveWatermarkLogo("color").path;
      if (logoPath) {
        try {
          const logoBytes = await readFile(logoPath);
          const logoImage = await pdfDoc.embedPng(logoBytes);

          for (const targetPageNum of requestedTargetPages) {
            // targetPageNum is 1-based index
            if (targetPageNum >= 1 && targetPageNum <= totalPages) {
              const targetPage = pages[targetPageNum - 1];
              const { width, height } = targetPage.getSize();

              // Logo cân đối ở trung tâm trang; logo cao/hẹp thì giới hạn theo chiều cao
              let imgWidth = Math.min(width * 0.45, 260);
              let imgHeight = (logoImage.height / logoImage.width) * imgWidth;
              const maxHeight = Math.min(height * 0.45, 260);
              if (imgHeight > maxHeight) {
                imgWidth = (imgWidth * maxHeight) / imgHeight;
                imgHeight = maxHeight;
              }

              targetPage.drawImage(logoImage, {
                x: width / 2 - imgWidth / 2,
                y: height / 2 - imgHeight / 2,
                width: imgWidth,
                height: imgHeight,
                opacity: 0.22,
              });
              watermarkPagesApplied.push(targetPageNum);
            } else {
              watermarkPagesMissing.push(targetPageNum);
            }
          }
        } catch (e) {
          console.error("Failed to embed logo watermark in PDF:", e);
        }
      }
    }

    const savedBytes = await pdfDoc.save();
    return {
      pdfBytes: savedBytes,
      totalPages,
      watermarkPagesApplied,
      watermarkPagesMissing,
    };
  }

  /**
   * PDF xem trước: trang 1 (chỉ kiểu chữ ký) và trang logo đầu tiên được cấu hình.
   * Dùng nội dung giả lập văn bản để thấy watermark nằm trên trang thật trông ra sao.
   */
  async buildPreviewPdf(
    style: SignatureStyleType,
    options: { watermarkText?: string; watermarkPages?: string }
  ): Promise<Uint8Array> {
    const logoPages = this.parsePageNumbers(options.watermarkPages);
    const logoPage = logoPages.length > 0 ? Math.min(logoPages[0], 500) : 0;
    const pageCount = Math.max(1, logoPage);

    const sample = await PDFDocument.create();
    const font = await sample.embedFont(StandardFonts.Helvetica);
    const bold = await sample.embedFont(StandardFonts.HelveticaBold);
    const keep = new Set([1, logoPage].filter((n) => n > 0));
    for (let n = 1; n <= pageCount; n++) {
      const page = sample.addPage([595.28, 841.89]); // A4
      if (!keep.has(n)) continue; // các trang ở giữa bị bỏ đi sau khi đóng dấu
      const { width, height } = page.getSize();
      const label = n === logoPage ? `Page ${n} - logo watermark page` : `Page ${n}`;
      page.drawText("Watermark preview", { x: 72, y: height - 90, size: 18, font: bold, color: rgb(0.15, 0.15, 0.15) });
      page.drawText(label, { x: 72, y: height - 112, size: 11, font, color: rgb(0.4, 0.4, 0.4) });
      // Các dòng xám mô phỏng đoạn văn
      let y = height - 150;
      while (y > 90) {
        for (let line = 0; line < 6 && y > 90; line++, y -= 16) {
          const lineWidth = line === 5 ? (width - 144) * 0.55 : width - 144;
          page.drawRectangle({ x: 72, y, width: lineWidth, height: 6, color: rgb(0.86, 0.86, 0.86) });
        }
        y -= 18;
      }
      page.drawText(String(n), { x: width / 2 - 4, y: 40, size: 10, font, color: rgb(0.5, 0.5, 0.5) });
    }

    const stamped = await this.stampPdfBytesDetailed(await sample.save(), style, {
      watermarkText: options.watermarkText,
      watermarkPages: logoPage > 0 ? [logoPage] : [],
    });

    const stampedDoc = await PDFDocument.load(stamped.pdfBytes);
    const output = await PDFDocument.create();
    const indices = Array.from(keep).sort((a, b) => a - b).map((n) => n - 1);
    const copied = await output.copyPages(stampedDoc, indices);
    copied.forEach((page) => output.addPage(page));
    return output.save();
  }
}
