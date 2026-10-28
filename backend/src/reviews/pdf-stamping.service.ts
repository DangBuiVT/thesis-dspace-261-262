import { Injectable } from "@nestjs/common";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { readFile } from "node:fs/promises";

export type SignatureStyleType = "margin_strips" | "diagonal" | "invisible";

@Injectable()
export class PdfStampingService {
  private readonly institutionText = "DAI HOC BACH KHOA THANH PHO HO CHI MINH - HCMUT";

  /**
   * Đóng dấu chữ ký số điện tử lên toàn bộ các trang của file PDF
   */
  async stampPdfFile(
    filePath: string,
    style: SignatureStyleType = "margin_strips",
    metadata?: { serial?: string; signedAt?: string }
  ): Promise<Uint8Array> {
    const existingPdfBytes = await readFile(filePath);
    
    // Nếu là kiểu vô hình thì trả về nguyên bản
    if (style === "invisible") {
      return existingPdfBytes;
    }

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();

      if (style === "margin_strips") {
        // Dải lề trái: chữ chạy dọc từ dưới lên
        page.drawText(this.institutionText, {
          x: 16,
          y: height / 2 - 140,
          size: 7.5,
          font: helveticaBold,
          color: rgb(0, 0.2, 0.45),
          rotate: degrees(90),
        });

        // Dải lề phải: chữ chạy dọc từ trên xuống
        page.drawText(this.institutionText, {
          x: width - 16,
          y: height / 2 + 140,
          size: 7.5,
          font: helveticaBold,
          color: rgb(0, 0.2, 0.45),
          rotate: degrees(-90),
        });

        // Đường chỉ viền biên nhẹ ở lề trái và lề phải
        page.drawLine({
          start: { x: 26, y: 30 },
          end: { x: 26, y: height - 30 },
          thickness: 0.75,
          color: rgb(0, 0.32, 0.61),
          opacity: 0.6,
        });

        page.drawLine({
          start: { x: width - 26, y: 30 },
          end: { x: width - 26, y: height - 30 },
          thickness: 0.75,
          color: rgb(0, 0.32, 0.61),
          opacity: 0.6,
        });
      } else if (style === "diagonal") {
        // Chữ ký chéo nghiêng 45 độ giữa trang với độ mờ chuẩn
        const fontSize = Math.min(width, height) * 0.038;
        page.drawText(`[DAI HOC BACH KHOA - HCMUT] ELECTRONICALLY SIGNED`, {
          x: width * 0.15,
          y: height * 0.35,
          size: fontSize,
          font: helveticaBold,
          color: rgb(0, 0.2, 0.4),
          opacity: 0.18,
          rotate: degrees(45),
        });

        if (metadata?.serial) {
          page.drawText(`CERT SERIAL: ${metadata.serial}`, {
            x: width * 0.2,
            y: height * 0.35 - 18,
            size: fontSize * 0.65,
            font: helvetica,
            color: rgb(0.1, 0.2, 0.4),
            opacity: 0.15,
            rotate: degrees(45),
          });
        }
      }
    }

    return await pdfDoc.save();
  }
}