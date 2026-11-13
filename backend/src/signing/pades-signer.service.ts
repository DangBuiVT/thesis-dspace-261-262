import { Injectable, InternalServerErrorException } from "@nestjs/common";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFString } from "pdf-lib";
import { createHash } from "node:crypto";
import { PkiService } from "./pki.service";
import { TimestampOutcome, TsaClient } from "./tsa.client";

const OID = {
  data: "1.2.840.113549.1.7.1",
  contentType: "1.2.840.113549.1.9.3",
  signingTime: "1.2.840.113549.1.9.5",
  messageDigest: "1.2.840.113549.1.9.4",
  signingCertificateV2: "1.2.840.113549.1.9.16.2.47",
  signatureTimeStampToken: "1.2.840.113549.1.9.16.2.14",
};

/** Dung lượng dành cho CMS trong /Contents (bytes). */
const CMS_CAPACITY = 16384;
const BR_PLACEHOLDER = "9999999999";
const BR_PATTERN = /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\]/;

export interface PadesSignResult {
  /** PDF đã ký (các byte cuối cùng sẽ được lưu). */
  bytes: Uint8Array;
  /** SHA-256 của toàn bộ file PDF đã ký. */
  fileSha256: string;
  signedAt: Date;
  certificateSerial: string;
  issuer: string;
  subject: string;
  devCertificate: boolean;
  timestamp: TimestampOutcome;
}

export interface PadesVerifyResult {
  valid: boolean;
  /** Chữ ký có bao phủ toàn bộ file (không có chỉnh sửa sau khi ký). */
  coversWholeFile: boolean;
  signedAt?: Date;
  certificateSerial?: string;
  timestampTime?: Date;
  errors: string[];
}

/**
 * Ký PDF theo PAdES (ETSI.CAdES.detached):
 *  1. Thêm trường chữ ký (signature dictionary) với /Contents và /ByteRange đặt sẵn độ dài.
 *  2. Tính SHA-256 trên các vùng ByteRange (loại trừ /Contents).
 *  3. Tạo CMS SignedData (RSA-SHA256, signed attributes: contentType, signingTime,
 *     messageDigest, signingCertificateV2), gắn chuỗi chứng thư.
 *  4. Xin dấu thời gian RFC 3161 cho chữ ký và gắn làm unsigned attribute (PAdES-B-T).
 *  5. Ghi CMS vào /Contents.
 */
@Injectable()
export class PadesSigner {
  constructor(
    private readonly pki: PkiService,
    private readonly tsa: TsaClient
  ) {}

  async signPdf(pdfBytes: Uint8Array, opts: { signerName: string; reason: string }): Promise<PadesSignResult> {
    const identity = await this.pki.identity();
    const signedAt = new Date();

    const buf = await this.addSignatureField(pdfBytes, opts, signedAt);
    const text = buf.toString("latin1");
    const brMatch = BR_PATTERN.exec(text);
    if (!brMatch) throw new InternalServerErrorException("Không tạo được trường chữ ký PDF");
    const placeholderHex = "<" + "0".repeat(CMS_CAPACITY * 2) + ">";
    const c0 = text.indexOf(placeholderHex, brMatch.index);
    if (c0 < 0) throw new InternalServerErrorException("Không tìm thấy vùng /Contents");
    const c1 = c0 + placeholderHex.length;
    const total = buf.length;

    // ByteRange phải được ghi trước khi băm (nó nằm trong vùng được ký), và độ dài không đổi.
    const pad = (n: number) => String(n).padStart(10, "0");
    const brText = `/ByteRange [0 ${pad(c0)} ${pad(c1)} ${pad(total - c1)}]`;
    const brLen = brMatch[0].length;
    buf.write(brText.padEnd(brLen, " "), brMatch.index, "latin1");

    const digest = signedRangeDigest(buf, c0, c1);
    const cms = await this.buildCms(identity, digest, signedAt);

    const tsOutcome = await this.tsa.timestampSignature(cms.signatureValue);
    if (tsOutcome.status === "granted" && tsOutcome.tokenDer) {
      cms.signerInfo.unsignedAttrs = new pkijs.SignedAndUnsignedAttributes({
        type: 1,
        attributes: [
          new pkijs.Attribute({
            type: OID.signatureTimeStampToken,
            values: [asn1js.fromBER(tsOutcome.tokenDer).result],
          }),
        ],
      });
    }

    const contentInfo = new pkijs.ContentInfo({
      contentType: pkijs.ContentInfo.SIGNED_DATA,
      content: cms.signedData.toSchema(true),
    });
    const der = new Uint8Array(contentInfo.toSchema().toBER(false));
    if (der.byteLength > CMS_CAPACITY) {
      throw new InternalServerErrorException("Chữ ký CMS vượt quá dung lượng cho phép");
    }
    const hex = Buffer.from(der).toString("hex").padEnd(CMS_CAPACITY * 2, "0");
    buf.write(hex, c0 + 1, "latin1");

    return {
      bytes: new Uint8Array(buf),
      fileSha256: createHash("sha256").update(buf).digest("hex"),
      signedAt,
      certificateSerial: identity.serialHex,
      issuer: identity.issuer,
      subject: identity.subject,
      devCertificate: identity.devGenerated,
      timestamp: tsOutcome,
    };
  }

  /** Kiểm tra chữ ký trong file PDF: toàn vẹn, chữ ký CMS, dấu thời gian TSA. */
  async verifyPdf(pdfBytes: Uint8Array): Promise<PadesVerifyResult> {
    const errors: string[] = [];
    const buf = Buffer.from(pdfBytes);
    const text = buf.toString("latin1");
    const br = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(text);
    if (!br) return { valid: false, coversWholeFile: false, errors: ["Không có chữ ký PDF"] };

    const [a, c0, c1, len2] = br.slice(1).map(Number);
    if (a !== 0 || c1 + len2 !== buf.length) {
      errors.push("File bị chỉnh sửa sau khi ký (chữ ký không bao phủ toàn bộ file)");
    }
    const hexStart = c0 + 1;
    const hexEnd = c1 - 1;
    const cmsHex = text.slice(hexStart, hexEnd);
    const cmsBuf = Buffer.from(cmsHex, "hex");

    const signedPart = Buffer.concat([buf.subarray(0, c0), buf.subarray(c1, c1 + len2)]);
    const digest = createHash("sha256").update(signedPart).digest();

    const parsed = asn1js.fromBER(toAB(cmsBuf));
    if (parsed.offset === -1) {
      return { valid: false, coversWholeFile: errors.length === 0, errors: [...errors, "CMS không đọc được"] };
    }
    const contentInfo = new pkijs.ContentInfo({ schema: parsed.result });
    const signed = new pkijs.SignedData({ schema: contentInfo.content });
    const signerInfo = signed.signerInfos[0];

    const mdAttr = signerInfo.signedAttrs?.attributes.find((x) => x.type === OID.messageDigest);
    const storedDigest = mdAttr ? Buffer.from(mdAttr.values[0].valueBlock.valueHexView) : null;
    if (!storedDigest || !storedDigest.equals(digest)) {
      errors.push("Băm nội dung không khớp với chữ ký (file bị sửa đổi)");
    }

    let sigOk = false;
    try {
      sigOk = await signed.verify({ signer: 0, data: toAB(signedPart), checkChain: false });
    } catch (e) {
      errors.push(`Lỗi kiểm tra chữ ký: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!sigOk) errors.push("Chữ ký RSA không hợp lệ");

    const signingTimeAttr = signerInfo.signedAttrs?.attributes.find((x) => x.type === OID.signingTime);
    const signedAt = signingTimeAttr ? (signingTimeAttr.values[0] as asn1js.UTCTime).toDate() : undefined;

    let timestampTime: Date | undefined;
    const tsAttr = signerInfo.unsignedAttrs?.attributes.find((x) => x.type === OID.signatureTimeStampToken);
    if (tsAttr) {
      try {
        const tokenCi = new pkijs.ContentInfo({ schema: tsAttr.values[0] });
        const tokenSd = new pkijs.SignedData({ schema: tokenCi.content });
        const tst = pkijs.TSTInfo.fromBER(tokenSd.encapContentInfo.eContent!.valueBlock.valueHexView.slice().buffer);
        const sigValue = Buffer.from(signerInfo.signature.valueBlock.valueHexView);
        const sigDigest = createHash("sha256").update(sigValue).digest();
        if (!Buffer.from(tst.messageImprint.hashedMessage.valueBlock.valueHexView).equals(sigDigest)) {
          errors.push("Dấu thời gian không gắn với chữ ký này");
        }
        timestampTime = tst.genTime;
      } catch (e) {
        errors.push(`Dấu thời gian không đọc được: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const leaf = (signed.certificates ?? []).find((c) => c instanceof pkijs.Certificate) as pkijs.Certificate | undefined;
    const serial = leaf ? Buffer.from(leaf.serialNumber.valueBlock.valueHexView).toString("hex") : undefined;

    return {
      valid: errors.length === 0,
      coversWholeFile: c1 + len2 === buf.length && a === 0,
      signedAt,
      certificateSerial: serial,
      timestampTime,
      errors,
    };
  }

  /** Thêm signature dictionary + trường ẩn với placeholder cố định kích thước. */
  private async addSignatureField(
    pdfBytes: Uint8Array,
    opts: { signerName: string; reason: string },
    signedAt: Date
  ): Promise<Buffer> {
    const doc = await PDFDocument.load(pdfBytes);
    const ctx = doc.context;

    const sigDict = ctx.obj({}) as PDFDict;
    sigDict.set(PDFName.of("Type"), PDFName.of("Sig"));
    sigDict.set(PDFName.of("Filter"), PDFName.of("Adobe.PPKLite"));
    sigDict.set(PDFName.of("SubFilter"), PDFName.of("ETSI.CAdES.detached"));
    const br = PDFArray.withContext(ctx);
    for (const n of [0, 9999999999, 9999999999, 9999999999]) br.push(PDFNumber.of(n));
    sigDict.set(PDFName.of("ByteRange"), br);
    sigDict.set(PDFName.of("Contents"), PDFHexString.of("0".repeat(CMS_CAPACITY * 2)));
    sigDict.set(PDFName.of("M"), PDFString.fromDate(signedAt));
    sigDict.set(PDFName.of("Reason"), PDFString.of(opts.reason));
    sigDict.set(PDFName.of("Name"), PDFString.of(opts.signerName));
    const sigRef = ctx.register(sigDict);

    const page = doc.getPage(0);
    const fieldDict = ctx.obj({}) as PDFDict;
    fieldDict.set(PDFName.of("Type"), PDFName.of("Annot"));
    fieldDict.set(PDFName.of("Subtype"), PDFName.of("Widget"));
    fieldDict.set(PDFName.of("FT"), PDFName.of("Sig"));
    fieldDict.set(PDFName.of("T"), PDFString.of("BKlibSignature1"));
    fieldDict.set(PDFName.of("V"), sigRef);
    const rect = PDFArray.withContext(ctx);
    for (const n of [0, 0, 0, 0]) rect.push(PDFNumber.of(n));
    fieldDict.set(PDFName.of("Rect"), rect);
    fieldDict.set(PDFName.of("F"), PDFNumber.of(132));
    fieldDict.set(PDFName.of("P"), page.ref);
    const fieldRef = ctx.register(fieldDict);

    let annots = optionalDict(page.node, "Annots", PDFArray);
    if (!annots) {
      annots = PDFArray.withContext(ctx);
      page.node.set(PDFName.of("Annots"), annots);
    }
    annots.push(fieldRef);

    let acro = optionalDict(doc.catalog, "AcroForm", PDFDict);
    if (!acro) {
      acro = ctx.obj({}) as PDFDict;
      doc.catalog.set(PDFName.of("AcroForm"), ctx.register(acro));
    }
    let fields = optionalDict(acro, "Fields", PDFArray);
    if (!fields) {
      fields = PDFArray.withContext(ctx);
      acro.set(PDFName.of("Fields"), fields);
    }
    fields.push(fieldRef);
    acro.set(PDFName.of("SigFlags"), PDFNumber.of(3));

    const saved = await doc.save({ useObjectStreams: false });
    return Buffer.from(saved);
  }

  private async buildCms(
    identity: Awaited<ReturnType<PkiService["identity"]>>,
    digest: Buffer,
    signedAt: Date
  ) {
    const leaf = pkijs.Certificate.fromBER(identity.leafDer);
    const certHash = createHash("sha256").update(Buffer.from(identity.leafDer)).digest();

    const attributes = [
      new pkijs.Attribute({
        type: OID.contentType,
        values: [new asn1js.ObjectIdentifier({ value: OID.data })],
      }),
      new pkijs.Attribute({
        type: OID.signingTime,
        values: [new asn1js.UTCTime({ valueDate: signedAt })],
      }),
      new pkijs.Attribute({
        type: OID.messageDigest,
        values: [new asn1js.OctetString({ valueHex: toAB(digest) })],
      }),
      new pkijs.Attribute({
        type: OID.signingCertificateV2,
        values: [
          new asn1js.Sequence({
            value: [
              new asn1js.Sequence({
                value: [
                  new asn1js.Sequence({
                    value: [new asn1js.OctetString({ valueHex: toAB(certHash) })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ];

    const signerInfo = new pkijs.SignerInfo({
      version: 1,
      sid: new pkijs.IssuerAndSerialNumber({ issuer: leaf.issuer, serialNumber: leaf.serialNumber }),
      signedAttrs: new pkijs.SignedAndUnsignedAttributes({ type: 0, attributes }),
    });

    const certificates = [leaf, ...identity.chainDer.map((der) => pkijs.Certificate.fromBER(der))];
    const signedData = new pkijs.SignedData({
      version: 1,
      encapContentInfo: new pkijs.EncapsulatedContentInfo({ eContentType: OID.data }),
      certificates,
      signerInfos: [signerInfo],
    });
    await signedData.sign(identity.privateKey, 0, "SHA-256");

    const sigView = signerInfo.signature.valueBlock.valueHexView;
    return {
      signedData,
      signerInfo,
      signatureValue: sigView.slice().buffer as ArrayBuffer,
    };
  }
}

/** Đọc một khóa tùy chọn (có thể là tham chiếu gián tiếp) và kiểm tra kiểu. */
function optionalDict<T>(holder: PDFDict, key: string, type: { prototype: T }): T | undefined {
  const raw = holder.get(PDFName.of(key));
  if (!raw) return undefined;
  const resolved: unknown = holder.context.lookup(raw);
  return resolved instanceof (type as unknown as new () => unknown) ? (resolved as T) : undefined;
}

function signedRangeDigest(buf: Buffer, c0: number, c1: number): Buffer {
  return createHash("sha256").update(buf.subarray(0, c0)).update(buf.subarray(c1)).digest();
}

function toAB(buf: Buffer | Uint8Array): ArrayBuffer {
  const u8 = Buffer.from(buf);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}
