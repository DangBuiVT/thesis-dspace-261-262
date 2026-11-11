import { Injectable } from "@nestjs/common";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as path from "node:path";

export type SignatureStyleType = "margin_strips" | "diagonal" | "invisible";

export interface StampingResult {
  pdfBytes: Uint8Array;
  totalPages: number;
  watermarkPagesApplied: number[];
  watermarkPagesMissing: number[];
}

@Injectable()
export class PdfStampingService {
  private readonly institutionText = "DAI HOC BACH KHOA THANH PHO HO CHI MINH - HCMUT";

  /**
   * Helper to resolve the path of hcmut_nobg.png
   */
  private resolveLogoPath(): string | null {
    const candidatePaths = [
      path.resolve(__dirname, "../assets/hcmut_nobg.png"),
      path.resolve(__dirname, "../../src/assets/hcmut_nobg.png"),
      path.resolve(process.cwd(), "src/assets/hcmut_nobg.png"),
      path.resolve(process.cwd(), "uploads/assets/hcmut_nobg.png"),
      path.resolve(process.cwd(), "hcmut_nobg.png"),
      path.resolve(process.cwd(), "../hcmut_nobg.png"),
    ];

    for (const p of candidatePaths) {
      if (existsSync(p)) {
        return p;
      }
    }
    return null;
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
    metadata?: { 
      serial?: string; 
      signedAt?: string;
      watermarkPages?: string | number[];
      enableLogoWatermark?: boolean;
    }
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
    metadata?: { 
      serial?: string; 
      signedAt?: string;
      watermarkPages?: string | number[];
      enableLogoWatermark?: boolean;
    }
  ): Promise<StampingResult> {
    const existingPdfBytes = await readFile(filePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    // 1. CHÈN CHỮ KÝ SỐ TOÀN BỘ CÁC TRANG (nếu style !== invisible)
    if (style !== "invisible") {
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const page of pages) {
        const { width, height } = page.getSize();
        const text1 = this.institutionText;

        if (style === "margin_strips") {
          const marginFontSize = 20;
          const textWidth = helveticaBold.widthOfTextAtSize(text1, marginFontSize);
          const marginOffset = 30; // Kéo lề vào trong để chữ size 20 không bị cắt mép

          // Dải lề trái: chữ chạy dọc từ dưới lên
          page.drawText(text1, {
            x: marginOffset,
            y: height / 2 - textWidth / 2,
            size: marginFontSize,
            font: helveticaBold,
            color: rgb(0, 0.2, 0.4),
            opacity: 0.12,
            rotate: degrees(90),
          });

          // Dải lề phải: chữ chạy dọc từ trên xuống
          page.drawText(text1, {
            x: width - marginOffset,
            y: height / 2 + textWidth / 2,
            size: marginFontSize,
            font: helveticaBold,
            color: rgb(0, 0.2, 0.4),
            opacity: 0.12,
            rotate: degrees(-90),
          });
        } else if (style === "diagonal") {
          // Căn giữa tuyệt đối cả 2 dòng theo góc nghiêng 45 độ tại tâm trang giấy 
          const angle = 45;
          const rad = (angle * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);

          const text2 = metadata?.serial ? `CERT SERIAL: ${metadata.serial}` : "";

          const fontSize1 = Math.min(width, height) * 0.034;
          const fontSize2 = fontSize1 * 0.62;

          const w1 = helveticaBold.widthOfTextAtSize(text1, fontSize1);
          const w2 = text2 ? helvetica.widthOfTextAtSize(text2, fontSize2) : 0;

          const lineGap = fontSize1 * 0.55;
          const v1 = text2 ? (lineGap + fontSize2) / 2 : 0;
          const v2 = text2 ? -(fontSize1 + lineGap) / 2 : 0;

          const baselineV1 = v1 - fontSize1 * 0.35;
          const x1 = width / 2 - (w1 / 2) * cos + baselineV1 * sin;
          const y1 = height / 2 - (w1 / 2) * sin - baselineV1 * cos;
          page.drawText(text1, {
            x: x1,
            y: y1,
            size: fontSize1,
            font: helveticaBold,
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

    // 2. CHÈN WATERMARK LOGO HCMUT_NOBG.PNG MỜ 0.22 OPACITY BÍ MẬT Ở CÁC TRANG CHỈ ĐỊNH
    const watermarkPagesApplied: number[] = [];
    const watermarkPagesMissing: number[] = [];

    const isLogoEnabled = metadata?.enableLogoWatermark !== false;
    const requestedTargetPages = this.parsePageNumbers(metadata?.watermarkPages);

    if (isLogoEnabled && requestedTargetPages.length > 0) {
      const logoPath = this.resolveLogoPath();
      if (logoPath) {
        try {
          const logoBytes = await readFile(logoPath);
          const logoImage = await pdfDoc.embedPng(logoBytes);

          for (const targetPageNum of requestedTargetPages) {
            // targetPageNum is 1-based index
            if (targetPageNum >= 1 && targetPageNum <= totalPages) {
              const targetPage = pages[targetPageNum - 1];
              const { width, height } = targetPage.getSize();

              // Kích thước logo watermark cân đối ở trung tâm trang (chiều rộng khoảng 35% chiều rộng trang)
              const imgWidth = Math.min(width * 0.45, 260);
              const imgHeight = (logoImage.height / logoImage.width) * imgWidth;

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
}
