import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { createPgPool } from "../users/db-pool";
import { PdfStampingService, SignatureStyleType } from "../reviews/pdf-stamping.service";
import { PadesSigner, PadesVerifyResult } from "./pades-signer.service";
import type { TimestampOutcome } from "./tsa.client";

export interface SignedArchive {
  fileSha256: string;
  certificateSerial: string;
  issuer: string;
  signedAt: Date;
  timestamp: TimestampOutcome;
  devCertificate: boolean;
  watermarkPagesMissing: number[];
  totalPages: number;
}

/**
 * Lưu chiểu: đóng dấu hình ảnh + ký PAdES + dấu thời gian, rồi lưu một bản ký cố định.
 * Bản này là file duy nhất được tải xuống sau khi lưu chiểu (không đóng dấu lại mỗi lần tải).
 */
@Injectable()
export class ArchiveSigningService {
  private readonly db = createPgPool();

  constructor(
    private readonly stamping: PdfStampingService,
    private readonly pades: PadesSigner
  ) {}

  /** Trả null nếu bài nộp không có file PDF (không có gì để ký). */
  async signArchivedPdf(input: {
    submissionId: string;
    sourceFileId?: string;
    actorName: string;
    actorSub: string;
    style: SignatureStyleType;
    watermarkPages: string;
  }): Promise<SignedArchive | null> {
    const src = await this.db.query<{ id: string; file_name: string; file_url: string }>(
      `SELECT id, file_name, file_url FROM submission_files
       WHERE submission_id = $1::uuid AND LOWER(file_name) LIKE '%.pdf'
         AND ($2::uuid IS NULL OR id = $2::uuid)
       LIMIT 1`,
      [input.submissionId, input.sourceFileId ?? null]
    );
    const source = src.rows[0];
    if (!source) return null;
    if (!existsSync(source.file_url)) {
      throw new NotFoundException("File PDF gốc không tồn tại trên máy chủ");
    }

    const stamped = await this.stamping.stampPdfFileDetailed(source.file_url, input.style, {
      watermarkPages: input.watermarkPages,
      enableLogoWatermark: true,
    });
    const signed = await this.pades.signPdf(stamped.pdfBytes, {
      signerName: input.actorName,
      reason: "Lưu chiểu luận văn",
    });

    const dir = path.resolve(process.cwd(), "uploads", "signed", input.submissionId);
    mkdirSync(dir, { recursive: true });
    const safeName = path.basename(source.file_name).replace(/[^\w.-]+/g, "_");
    const filePath = path.join(dir, `${signed.signedAt.getTime()}-${safeName}`);
    await writeFile(filePath, signed.bytes);

    await this.db.query(
      `INSERT INTO submission_signed_files
         (id, submission_id, source_file_id, file_name, file_path, sha256, signature_style,
          certificate_serial, issuer, signed_at, tsa_url, tsa_status, tsa_time, signer_sub)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        randomUUID(),
        input.submissionId,
        source.id,
        source.file_name,
        filePath,
        signed.fileSha256,
        input.style,
        signed.certificateSerial,
        signed.issuer,
        signed.signedAt,
        signed.timestamp.tsaUrl,
        signed.timestamp.status,
        signed.timestamp.genTime ?? null,
        input.actorSub,
      ]
    );

    return {
      fileSha256: signed.fileSha256,
      certificateSerial: signed.certificateSerial,
      issuer: signed.issuer,
      signedAt: signed.signedAt,
      timestamp: signed.timestamp,
      devCertificate: signed.devCertificate,
      watermarkPagesMissing: stamped.watermarkPagesMissing,
      totalPages: stamped.totalPages,
    };
  }

  /** Kiểu chữ ký mặc định do Admin cấu hình (system_settings.signature_style). */
  async defaultSignatureStyle(): Promise<SignatureStyleType> {
    const res = await this.db.query<{ value: string }>(
      `SELECT value FROM system_settings WHERE key = 'signature_style' LIMIT 1`
    );
    const value = res.rows[0]?.value;
    return value === "diagonal" || value === "invisible" ? value : "margin_strips";
  }

  /** Số trang watermark mặc định (system_settings.signature_watermark_pages). */
  async defaultWatermarkPages(): Promise<string> {
    const res = await this.db.query<{ value: string }>(
      `SELECT value FROM system_settings WHERE key = 'signature_watermark_pages' LIMIT 1`
    );
    return res.rows[0]?.value?.trim() || "10";
  }

  /** Đường dẫn file đã ký mới nhất cho một file gốc, hoặc null. */
  async latestSignedPath(submissionId: string, sourceFileId: string): Promise<{ filePath: string; fileName: string } | null> {
    const res = await this.db.query<{ file_path: string; file_name: string }>(
      `SELECT file_path, file_name FROM submission_signed_files
       WHERE submission_id = $1::uuid AND source_file_id = $2::uuid
       ORDER BY signed_at DESC LIMIT 1`,
      [submissionId, sourceFileId]
    );
    const row = res.rows[0];
    if (!row) return null;
    const root = path.resolve(process.cwd(), "uploads", "signed", submissionId) + path.sep;
    if (!path.resolve(row.file_path).startsWith(root) || !existsSync(row.file_path)) return null;
    return { filePath: row.file_path, fileName: row.file_name };
  }

  /** Kiểm tra lại file đã ký: băm có khớp bản ghi không, và chữ ký/dấu thời gian. */
  async status(submissionId: string) {
    const res = await this.db.query<{
      id: string;
      file_path: string;
      file_name: string;
      sha256: string;
      certificate_serial: string;
      issuer: string;
      signed_at: Date;
      tsa_status: string;
      tsa_time: Date | null;
      tsa_url: string;
    }>(
      `SELECT id, file_path, file_name, sha256, certificate_serial, issuer, signed_at,
              tsa_status, tsa_time, tsa_url
       FROM submission_signed_files WHERE submission_id = $1::uuid
       ORDER BY signed_at DESC LIMIT 1`,
      [submissionId]
    );
    const row = res.rows[0];
    if (!row) return { signed: false as const };
    if (!existsSync(row.file_path)) {
      return { signed: true as const, fileFound: false as const, hashMatches: false, verification: null };
    }
    const bytes = await readFile(row.file_path);
    const hashMatches = createHash("sha256").update(bytes).digest("hex") === row.sha256;
    const verification: PadesVerifyResult = await this.pades.verifyPdf(new Uint8Array(bytes));
    return {
      signed: true as const,
      fileFound: true as const,
      fileName: row.file_name,
      certificateSerial: row.certificate_serial,
      issuer: row.issuer,
      signedAt: row.signed_at,
      timestamp: { status: row.tsa_status, tsaUrl: row.tsa_url, time: row.tsa_time },
      hashMatches,
      verification,
    };
  }
}

export function resolveSignatureStyle(style: string | undefined | null): SignatureStyleType {
  if (style === undefined || style === null || style === "" || style === "margin_strips") return "margin_strips";
  if (style === "diagonal" || style === "invisible") return style;
  throw new BadRequestException("Kiểu chữ ký không hợp lệ");
}

/** Thông tin chữ ký lưu vào sự kiện `digital_signature_signed` (đọc bởi API tải xuống và giao diện). */
export function signedEvidence(a: SignedArchive) {
  return {
    algorithm: "RSA-SHA256 · PAdES-B-T (CMS detached)",
    sha256_hash: a.fileSha256,
    certificate_serial: a.certificateSerial,
    issuer: a.issuer,
    signed_at: a.signedAt.toISOString(),
    tsa_status: a.timestamp.status,
    tsa_url: a.timestamp.tsaUrl,
    tsa_time: a.timestamp.genTime ? a.timestamp.genTime.toISOString() : null,
    dev_certificate: a.devCertificate,
  };
}
