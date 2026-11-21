import { Injectable, Logger } from "@nestjs/common";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import { createHash, randomBytes } from "node:crypto";

const OID_SHA256 = "2.16.840.1.101.3.4.2.1";

export interface TimestampOutcome {
  status: "granted" | "unavailable";
  tsaUrl: string;
  /** Token RFC 3161 (ContentInfo DER) để nhúng vào CMS như unsigned attribute. */
  tokenDer?: ArrayBuffer;
  genTime?: Date;
  error?: string;
}

/**
 * Xin dấu thời gian RFC 3161 cho giá trị chữ ký (SignerInfo.signature).
 * Lỗi TSA không chặn quy trình lưu chiểu: kết quả được ghi nhận là "unavailable".
 */
@Injectable()
export class TsaClient {
  private readonly logger = new Logger(TsaClient.name);

  async timestampSignature(signatureValue: ArrayBuffer): Promise<TimestampOutcome> {
    const tsaUrl = process.env.TSA_URL || "https://freetsa.org/tsr";
    if (tsaUrl === "none") {
      return { status: "unavailable", tsaUrl, error: "TSA đã tắt (TSA_URL=none)" };
    }
    try {
      const digest = createHash("sha256").update(Buffer.from(signatureValue)).digest();
      const nonce = Buffer.from(randomBytes(8));
      const request = new pkijs.TimeStampReq({
        version: 1,
        messageImprint: new pkijs.MessageImprint({
          hashAlgorithm: new pkijs.AlgorithmIdentifier({
            algorithmId: OID_SHA256,
            algorithmParams: new asn1js.Null(),
          }),
          hashedMessage: new asn1js.OctetString({ valueHex: toArrayBuffer(digest) }),
        }),
        nonce: new asn1js.Integer({ valueHex: toArrayBuffer(nonce) }),
        certReq: true,
      });
      const body = request.toSchema().toBER(false);

      // Thử lại một lần: lỗi mạng tạm thời (DNS/TLS lần đầu trong container) khá thường gặp.
      const post = () =>
        fetch(tsaUrl, {
          method: "POST",
          headers: { "Content-Type": "application/timestamp-query", Accept: "application/timestamp-reply" },
          body,
          signal: AbortSignal.timeout(20_000),
        });
      const response = await post().catch(async (first) => {
        this.logger.warn(`TSA ${tsaUrl} lỗi (${first instanceof Error ? first.message : first}), thử lại`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return post();
      });
      if (!response.ok) {
        throw new Error(`TSA HTTP ${response.status}`);
      }
      const respBuf = await response.arrayBuffer();
      const resp = pkijs.TimeStampResp.fromBER(respBuf);
      if (resp.status.status !== 0 && resp.status.status !== 1) {
        throw new Error(`TSA từ chối yêu cầu (status ${resp.status.status})`);
      }
      if (!resp.timeStampToken) {
        throw new Error("TSA không trả về token");
      }

      // Kiểm tra token: đúng message imprint và nonce của yêu cầu.
      const signed = new pkijs.SignedData({ schema: resp.timeStampToken.content });
      const eContent = signed.encapContentInfo.eContent;
      if (!eContent) throw new Error("Token TSA thiếu TSTInfo");
      const tst = pkijs.TSTInfo.fromBER(eContent.valueBlock.valueHexView.slice().buffer);
      const imprintOk = Buffer.from(tst.messageImprint.hashedMessage.valueBlock.valueHexView).equals(digest);
      const nonceOk =
        tst.nonce !== undefined &&
        Buffer.from(tst.nonce.valueBlock.valueHexView).equals(nonce);
      if (!imprintOk || !nonceOk) {
        throw new Error("Token TSA không khớp yêu cầu (imprint/nonce)");
      }

      return {
        status: "granted",
        tsaUrl,
        tokenDer: resp.timeStampToken.toSchema().toBER(false) as ArrayBuffer,
        genTime: tst.genTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Không lấy được dấu thời gian từ ${tsaUrl}: ${message}`);
      return { status: "unavailable", tsaUrl, error: message };
    }
  }
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}
