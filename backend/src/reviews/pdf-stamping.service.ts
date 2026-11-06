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

        // Đường chỉ viền biên nhẹ ở lề trái và lề phải
        // page.drawLine({
        //   start: { x: 26, y: 30 },
        //   end: { x: 26, y: height - 30 },
        //   thickness: 0.75,
        //   color: rgb(0, 0.32, 0.61),
        //   opacity: 0.6,
        // });

        // page.drawLine({
        //   start: { x: width - 26, y: 30 },
        //   end: { x: width - 26, y: height - 30 },
        //   thickness: 0.75,
        //   color: rgb(0, 0.32, 0.61),
        //   opacity: 0.6,
        // });
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

    return await pdfDoc.save();
  }
}