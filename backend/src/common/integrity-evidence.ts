import { createHash } from "node:crypto";

/**
 * Bằng chứng toàn vẹn cho bài nộp đã lưu chiểu.
 *
 * Đây CHỈ là băm SHA-256 (không có khóa bí mật, không phải chữ ký số RSA hay chứng thư CA).
 * Không ghi tên thuật toán RSA / PKCS#7 hay một CA giả khi chưa có chữ ký thật.
 */
export function buildIntegrityEvidence(
  submissionId: string,
  actorSub: string,
  signedAt: string,
  salt: string
) {
  const sha256Hash = createHash("sha256")
    .update(`${submissionId}-${actorSub}-${signedAt}-${salt}`)
    .digest("hex");
  return {
    algorithm: "SHA-256 (băm toàn vẹn nội bộ, chưa ký RSA)",
    sha256_hash: sha256Hash,
    certificate_serial: `HASH-${sha256Hash.slice(0, 16).toUpperCase()}`,
    issuer: "BKlib - lưu chiểu nội bộ (chưa có chứng thư CA)",
  };
}
