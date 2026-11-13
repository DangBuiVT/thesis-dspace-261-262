import { Injectable } from "@nestjs/common";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from "pdf-lib";
import { createHash } from "node:crypto";
import { PkiService, rdnToString } from "./pki.service";

/**
 * Kiểm tra chữ ký số trong một file PDF bất kỳ (PAdES / adbe.pkcs7.detached),
 * tương tự chức năng "Validate PDF Signature" của Stirling PDF / Adobe Reader.
 *
 * Khác với Stirling (không biết CA của trường), dịch vụ này tin cậy sẵn Root CA
 * của hệ thống (SIGNING_TRUST_PATH), nên chữ ký do hệ thống tạo ra được xác nhận
 * "VALID" mà không cần tải chứng thư CA lên.
 */

export type SignatureStatus = "VALID" | "VALID_UNTRUSTED" | "INVALID";

export interface CertificateInfo {
  subject: string;
  issuer: string;
  commonName: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  keySize: number | null;
  version: number;
  keyUsage: string[];
  extendedKeyUsage: string[];
  isCA: boolean;
  selfSigned: boolean;
  sha256Fingerprint: string;
}

export interface TimestampInfo {
  time: string;
  authority: string | null;
  serialNumber: string;
  hashAlgorithm: string;
  /** Chữ ký của TSA trên token hợp lệ. */
  signatureValid: boolean;
  /** messageImprint khớp với giá trị chữ ký. */
  imprintMatches: boolean;
}

export interface SignatureReport {
  index: number;
  fieldName: string | null;
  status: SignatureStatus;
  signerName: string | null;
  reason: string | null;
  location: string | null;
  contactInfo: string | null;
  signingTime: string | null;
  subFilter: string | null;
  digestAlgorithm: string | null;
  /** Kiểm tra mật mã: băm nội dung + chữ ký số. */
  integrityValid: boolean;
  signatureValid: boolean;
  coversWholeDocument: boolean;
  /** Có thay đổi được thêm sau chữ ký này (bản cập nhật tăng dần). */
  modifiedAfterSigning: boolean;
  chainTrusted: boolean;
  chainMessage: string | null;
  certificateValidAtSigningTime: boolean;
  keyUsageOk: boolean;
  signer: CertificateInfo | null;
  chain: CertificateInfo[];
  timestamp: TimestampInfo | null;
  errors: string[];
  warnings: string[];
}

export interface VerificationReport {
  fileName: string | null;
  fileSize: number;
  sha256: string;
  pageCount: number | null;
  title: string | null;
  createdAt: string | null;
  modifiedAt: string | null;
  totalSignatures: number;
  /** VALID chỉ khi mọi chữ ký VALID; NO_SIGNATURE nếu file không có chữ ký. */
  overallStatus: SignatureStatus | "NO_SIGNATURE";
  signatures: SignatureReport[];
  trustAnchors: Array<{ subject: string; sha256Fingerprint: string }>;
  verifiedAt: string;
}

const OID = {
  messageDigest: "1.2.840.113549.1.9.4",
  signingTime: "1.2.840.113549.1.9.5",
  signatureTimeStampToken: "1.2.840.113549.1.9.16.2.14",
  keyUsage: "2.5.29.15",
  extKeyUsage: "2.5.29.37",
  basicConstraints: "2.5.29.19",
  CN: "2.5.4.3",
};

const HASH_BY_OID: Record<string, { name: string; node: string }> = {
  "1.3.14.3.2.26": { name: "SHA-1", node: "sha1" },
  "2.16.840.1.101.3.4.2.1": { name: "SHA-256", node: "sha256" },
  "2.16.840.1.101.3.4.2.2": { name: "SHA-384", node: "sha384" },
  "2.16.840.1.101.3.4.2.3": { name: "SHA-512", node: "sha512" },
};

const SIG_ALG_NAMES: Record<string, string> = {
  "1.2.840.113549.1.1.5": "SHA1withRSA",
  "1.2.840.113549.1.1.11": "SHA256withRSA",
  "1.2.840.113549.1.1.12": "SHA384withRSA",
  "1.2.840.113549.1.1.13": "SHA512withRSA",
  "1.2.840.113549.1.1.10": "RSASSA-PSS",
  "1.2.840.10045.4.3.2": "SHA256withECDSA",
  "1.2.840.10045.4.3.3": "SHA384withECDSA",
  "1.2.840.10045.4.3.4": "SHA512withECDSA",
  "1.3.101.112": "Ed25519",
};

const PUBKEY_NAMES: Record<string, string> = {
  "1.2.840.113549.1.1.1": "RSA",
  "1.2.840.10045.2.1": "EC",
  "1.3.101.112": "Ed25519",
};

const CURVE_BITS: Record<string, number> = {
  "1.2.840.10045.3.1.7": 256,
  "1.3.132.0.34": 384,
  "1.3.132.0.35": 521,
};

const KEY_USAGE_NAMES = [
  "Digital Signature",
  "Non-Repudiation",
  "Key Encipherment",
  "Data Encipherment",
  "Key Agreement",
  "Certificate Sign",
  "CRL Sign",
  "Encipher Only",
  "Decipher Only",
];

const EKU_NAMES: Record<string, string> = {
  "1.3.6.1.5.5.7.3.1": "Server Authentication",
  "1.3.6.1.5.5.7.3.2": "Client Authentication",
  "1.3.6.1.5.5.7.3.3": "Code Signing",
  "1.3.6.1.5.5.7.3.4": "Email Protection",
  "1.3.6.1.5.5.7.3.8": "Time Stamping",
  "1.3.6.1.5.5.7.3.36": "Document Signing",
  "1.3.6.1.4.1.311.10.3.12": "Microsoft Document Signing",
  "1.2.840.113583.1.1.5": "Adobe Authentic Documents Trust",
};

interface SigDictMeta {
  fieldName: string | null;
  name: string | null;
  reason: string | null;
  location: string | null;
  contactInfo: string | null;
  m: string | null;
  subFilter: string | null;
}

@Injectable()
export class SignatureVerifierService {
  constructor(private readonly pki: PkiService) {}

  async verify(pdfBytes: Uint8Array, fileName: string | null = null): Promise<VerificationReport> {
    const buf = Buffer.from(pdfBytes);
    const anchors = await this.pki.trustAnchors();
    const ranges = findByteRanges(buf);

    const meta = await readPdfMeta(buf);
    const signatures: SignatureReport[] = [];
    for (let i = 0; i < ranges.length; i++) {
      const br = ranges[i];
      const dict = meta.sigDicts.get(br.join(",")) ?? null;
      signatures.push(await this.verifyOne(buf, br, i + 1, dict, anchors));
    }

    let overall: VerificationReport["overallStatus"] = "NO_SIGNATURE";
    if (signatures.length > 0) {
      if (signatures.some((s) => s.status === "INVALID")) overall = "INVALID";
      else if (signatures.some((s) => s.status === "VALID_UNTRUSTED")) overall = "VALID_UNTRUSTED";
      else overall = "VALID";
    }

    return {
      fileName,
      fileSize: buf.length,
      sha256: createHash("sha256").update(buf).digest("hex"),
      pageCount: meta.pageCount,
      title: meta.title,
      createdAt: meta.createdAt,
      modifiedAt: meta.modifiedAt,
      totalSignatures: signatures.length,
      overallStatus: overall,
      signatures,
      trustAnchors: anchors.map((a) => ({
        subject: rdnToString(a.subject),
        sha256Fingerprint: fingerprint(a),
      })),
      verifiedAt: new Date().toISOString(),
    };
  }

  private async verifyOne(
    buf: Buffer,
    br: number[],
    index: number,
    meta: SigDictMeta | null,
    anchors: pkijs.Certificate[]
  ): Promise<SignatureReport> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const report: SignatureReport = {
      index,
      fieldName: meta?.fieldName ?? null,
      status: "INVALID",
      signerName: meta?.name ?? null,
      reason: meta?.reason ?? null,
      location: meta?.location ?? null,
      contactInfo: meta?.contactInfo ?? null,
      signingTime: meta?.m ?? null,
      subFilter: meta?.subFilter ?? null,
      digestAlgorithm: null,
      integrityValid: false,
      signatureValid: false,
      coversWholeDocument: false,
      modifiedAfterSigning: false,
      chainTrusted: false,
      chainMessage: null,
      certificateValidAtSigningTime: false,
      keyUsageOk: false,
      signer: null,
      chain: [],
      timestamp: null,
      errors,
      warnings,
    };

    const [a, c0, c1, len2] = br;
    if (a !== 0 || c0 <= 0 || c1 <= c0 || c1 + len2 > buf.length) {
      errors.push("ByteRange không hợp lệ");
      return report;
    }
    report.coversWholeDocument = c1 + len2 === buf.length;
    report.modifiedAfterSigning = !report.coversWholeDocument;

    // /Contents nằm giữa hai vùng ByteRange, dạng <hex...>
    const contentsText = buf.subarray(c0, c1).toString("latin1").replace(/[<>\s]/g, "");
    const cmsBuf = Buffer.from(contentsText, "hex");
    const signedPart = Buffer.concat([buf.subarray(0, c0), buf.subarray(c1, c1 + len2)]);

    let signed: pkijs.SignedData;
    try {
      const parsed = asn1js.fromBER(toAB(cmsBuf));
      if (parsed.offset === -1) throw new Error("ASN.1");
      const ci = new pkijs.ContentInfo({ schema: parsed.result });
      signed = new pkijs.SignedData({ schema: ci.content });
    } catch {
      errors.push("Không đọc được dữ liệu chữ ký CMS");
      return report;
    }
    const signerInfo = signed.signerInfos[0];
    if (!signerInfo) {
      errors.push("CMS không có SignerInfo");
      return report;
    }

    const hash = HASH_BY_OID[signerInfo.digestAlgorithm.algorithmId];
    report.digestAlgorithm = hash?.name ?? signerInfo.digestAlgorithm.algorithmId;

    const certs = (signed.certificates ?? []).filter((c): c is pkijs.Certificate => c instanceof pkijs.Certificate);
    const signerCert = findSignerCert(signerInfo, certs);
    if (!signerCert) {
      errors.push("Không tìm thấy chứng thư của người ký trong chữ ký");
      return report;
    }
    report.signer = certInfo(signerCert);
    if (!report.signerName) report.signerName = commonName(signerCert.subject);

    // 1) Toàn vẹn nội dung
    const mdAttr = signerInfo.signedAttrs?.attributes.find((x) => x.type === OID.messageDigest);
    if (hash && mdAttr) {
      const digest = createHash(hash.node).update(signedPart).digest();
      report.integrityValid = Buffer.from(mdAttr.values[0].valueBlock.valueHexView).equals(digest);
      if (!report.integrityValid) errors.push("Nội dung tài liệu đã bị thay đổi sau khi ký (băm không khớp)");
    } else {
      errors.push("Định dạng chữ ký không được hỗ trợ (thiếu messageDigest)");
    }

    // 2) Chữ ký số trên các thuộc tính đã ký
    try {
      report.signatureValid = await signed.verify({ signer: 0, data: toAB(signedPart), checkChain: false });
    } catch (e) {
      errors.push(`Chữ ký số không hợp lệ: ${errMsg(e)}`);
    }
    if (!report.signatureValid && !errors.some((x) => x.startsWith("Chữ ký số"))) {
      errors.push("Chữ ký số không khớp với khóa công khai của người ký");
    }

    const stAttr = signerInfo.signedAttrs?.attributes.find((x) => x.type === OID.signingTime);
    const cmsSigningTime = stAttr ? asn1Time(stAttr.values[0]) : null;
    if (cmsSigningTime) report.signingTime = cmsSigningTime.toISOString();
    else if (meta?.m) report.signingTime = meta.m;

    // 3) Dấu thời gian RFC 3161 (nếu có)
    const tsAttr = signerInfo.unsignedAttrs?.attributes.find((x) => x.type === OID.signatureTimeStampToken);
    let trustedTime: Date | null = null;
    if (tsAttr) {
      try {
        report.timestamp = await verifyTimestamp(tsAttr.values[0], signerInfo);
        if (!report.timestamp.signatureValid) warnings.push("Chữ ký của dấu thời gian không hợp lệ");
        if (!report.timestamp.imprintMatches) errors.push("Dấu thời gian không gắn với chữ ký này");
        if (report.timestamp.signatureValid && report.timestamp.imprintMatches) {
          trustedTime = new Date(report.timestamp.time);
        }
      } catch (e) {
        warnings.push(`Không đọc được dấu thời gian: ${errMsg(e)}`);
      }
    }

    // 4) Chuỗi chứng thư tới Root CA tin cậy, tại thời điểm ký
    const checkDate = trustedTime ?? cmsSigningTime ?? new Date();
    report.certificateValidAtSigningTime =
      signerCert.notBefore.value.getTime() <= checkDate.getTime() &&
      checkDate.getTime() <= signerCert.notAfter.value.getTime();
    if (!report.certificateValidAtSigningTime) errors.push("Chứng thư người ký không còn hiệu lực tại thời điểm ký");

    try {
      const engine = new pkijs.CertificateChainValidationEngine({
        trustedCerts: anchors,
        certs: [signerCert, ...certs.filter((c) => c !== signerCert)],
        checkDate,
      });
      const result = await engine.verify();
      report.chainTrusted = result.result === true;
      report.chainMessage = result.resultMessage || null;
      const path = (result.certificatePath ?? []) as pkijs.Certificate[];
      report.chain = (path.length ? path : buildDisplayChain(signerCert, certs)).map(certInfo);
    } catch (e) {
      report.chainMessage = errMsg(e);
      report.chain = buildDisplayChain(signerCert, certs).map(certInfo);
    }
    if (!report.chainTrusted) {
      warnings.push("Không xác minh được người ký: chứng thư không thuộc CA được hệ thống tin cậy");
    }

    // 5) Mục đích sử dụng khóa
    const ku = report.signer.keyUsage;
    report.keyUsageOk = ku.length === 0 || ku.includes("Digital Signature") || ku.includes("Non-Repudiation");
    if (!report.keyUsageOk) errors.push("Chứng thư không được phép dùng để ký (Key Usage)");

    if (report.modifiedAfterSigning) {
      warnings.push("Tài liệu có nội dung được thêm sau chữ ký này (bản cập nhật tăng dần)");
    }

    const cryptoOk = report.integrityValid && report.signatureValid && errors.length === 0;
    report.status = !cryptoOk ? "INVALID" : report.chainTrusted ? "VALID" : "VALID_UNTRUSTED";
    return report;
  }
}

/* ---------------------------------------------------------------- PDF parsing */

function findByteRanges(buf: Buffer): number[][] {
  const text = buf.toString("latin1");
  const re = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/g;
  const out: number[][] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const br = m.slice(1, 5).map(Number);
    const key = br.join(",");
    // Bỏ qua placeholder chưa điền và bản trùng lặp.
    if (seen.has(key) || br[1] >= 9999999999) continue;
    seen.add(key);
    out.push(br);
  }
  return out;
}

async function readPdfMeta(buf: Buffer) {
  const result = {
    pageCount: null as number | null,
    title: null as string | null,
    createdAt: null as string | null,
    modifiedAt: null as string | null,
    sigDicts: new Map<string, SigDictMeta>(),
  };
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(buf, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
  } catch {
    return result;
  }
  try {
    result.pageCount = doc.getPageCount();
    result.title = doc.getTitle() ?? null;
    result.createdAt = doc.getCreationDate()?.toISOString() ?? null;
    result.modifiedAt = doc.getModificationDate()?.toISOString() ?? null;
  } catch {
    /* metadata lỗi không ảnh hưởng việc kiểm tra chữ ký */
  }

  const fieldNames = new Map<PDFDict, string>();
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    const v = obj.get(PDFName.of("V"));
    const t = textOf(obj.get(PDFName.of("T")));
    if (v && t) {
      const target = doc.context.lookup(v);
      if (target instanceof PDFDict) fieldNames.set(target, t);
    }
  }
  const collect = (dict: PDFDict) => {
    const brObj = doc.context.lookup(dict.get(PDFName.of("ByteRange")));
    if (!brObj || !("asArray" in (brObj as object))) return;
    const arr = (brObj as unknown as { asArray(): unknown[] }).asArray();
    const key = arr.map((n) => String((n as { asNumber?: () => number }).asNumber?.() ?? n)).join(",");
    const sub = dict.get(PDFName.of("SubFilter"));
    result.sigDicts.set(key, {
      fieldName: fieldNames.get(dict) ?? null,
      name: textOf(dict.get(PDFName.of("Name"))),
      reason: textOf(dict.get(PDFName.of("Reason"))),
      location: textOf(dict.get(PDFName.of("Location"))),
      contactInfo: textOf(dict.get(PDFName.of("ContactInfo"))),
      m: pdfDate(textOf(dict.get(PDFName.of("M")))),
      subFilter: sub instanceof PDFName ? sub.decodeText() : null,
    });
  };
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict && obj.has(PDFName.of("ByteRange"))) collect(obj);
    // Chữ ký đặt trực tiếp (không gián tiếp) trong /V của trường.
    if (obj instanceof PDFDict) {
      const v = obj.get(PDFName.of("V"));
      if (v instanceof PDFDict && v.has(PDFName.of("ByteRange"))) {
        fieldNames.set(v, textOf(obj.get(PDFName.of("T"))) ?? "");
        collect(v);
      }
    }
  }
  return result;
}

function textOf(obj: unknown): string | null {
  if (obj instanceof PDFString || obj instanceof PDFHexString) {
    try {
      return obj.decodeText();
    } catch {
      return null;
    }
  }
  return null;
}

/** "D:20261113101953+07'00'" → ISO */
function pdfDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = /^D?:?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([Zz+-])?(\d{2})?'?(\d{2})?'?/.exec(raw);
  if (!m) return null;
  const [, y, mo = "01", d = "01", h = "00", mi = "00", s = "00", tz, th = "00", tm = "00"] = m;
  const offset = !tz || tz.toUpperCase() === "Z" ? "Z" : `${tz}${th}:${tm}`;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${offset}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/* ----------------------------------------------------------- Crypto helpers */

function findSignerCert(signerInfo: pkijs.SignerInfo, certs: pkijs.Certificate[]): pkijs.Certificate | undefined {
  const sid = signerInfo.sid;
  if (sid instanceof pkijs.IssuerAndSerialNumber) {
    return certs.find((c) => c.issuer.isEqual(sid.issuer) && c.serialNumber.isEqual(sid.serialNumber));
  }
  // SubjectKeyIdentifier
  const ski = Buffer.from((sid as asn1js.OctetString).valueBlock?.valueHexView ?? []);
  return certs.find((c) => {
    const ext = c.extensions?.find((e) => e.extnID === "2.5.29.14");
    return ext && Buffer.from((ext.parsedValue as asn1js.OctetString).valueBlock.valueHexView).equals(ski);
  });
}

function buildDisplayChain(leaf: pkijs.Certificate, certs: pkijs.Certificate[]): pkijs.Certificate[] {
  const chain = [leaf];
  let cur = leaf;
  while (!cur.subject.isEqual(cur.issuer) && chain.length < 10) {
    const parent = certs.find((c) => c.subject.isEqual(cur.issuer) && !chain.includes(c));
    if (!parent) break;
    chain.push(parent);
    cur = parent;
  }
  return chain;
}

async function verifyTimestamp(tokenSchema: asn1js.BaseBlock, signerInfo: pkijs.SignerInfo): Promise<TimestampInfo> {
  const ci = new pkijs.ContentInfo({ schema: tokenSchema });
  const sd = new pkijs.SignedData({ schema: ci.content });
  const eContent = sd.encapContentInfo.eContent!;
  const tstDer = tokenContentBytes(eContent);
  const tst = pkijs.TSTInfo.fromBER(tstDer);

  const hash = HASH_BY_OID[tst.messageImprint.hashAlgorithm.algorithmId];
  const sigValue = Buffer.from(signerInfo.signature.valueBlock.valueHexView);
  const imprintMatches =
    !!hash &&
    Buffer.from(tst.messageImprint.hashedMessage.valueBlock.valueHexView).equals(
      createHash(hash.node).update(sigValue).digest()
    );

  let signatureValid = false;
  try {
    // Với token TSTInfo, pkijs đối chiếu messageImprint với `data` = dữ liệu đã được đóng dấu
    // (ở đây là giá trị chữ ký), rồi kiểm tra chữ ký của TSA.
    signatureValid = await sd.verify({ signer: 0, checkChain: false, data: toAB(sigValue) });
  } catch {
    signatureValid = false;
  }

  const tsCerts = (sd.certificates ?? []).filter((c): c is pkijs.Certificate => c instanceof pkijs.Certificate);
  const tsSigner = findSignerCert(sd.signerInfos[0], tsCerts);
  let authority: string | null = tsSigner ? commonName(tsSigner.subject) ?? rdnToString(tsSigner.subject) : null;
  if (!authority && tst.tsa && tst.tsa.type === 4) {
    authority = rdnToString(tst.tsa.value as pkijs.RelativeDistinguishedNames);
  }

  return {
    time: tst.genTime.toISOString(),
    authority,
    serialNumber: Buffer.from(tst.serialNumber.valueBlock.valueHexView).toString("hex"),
    hashAlgorithm: hash?.name ?? tst.messageImprint.hashAlgorithm.algorithmId,
    signatureValid,
    imprintMatches,
  };
}

/** Nội dung OCTET STRING của token (có thể được mã hóa dạng constructed). */
function tokenContentBytes(eContent: asn1js.OctetString): ArrayBuffer {
  const block = eContent as asn1js.OctetString & { idBlock: { isConstructed: boolean } };
  if (block.idBlock.isConstructed) {
    const parts = (block.valueBlock.value as asn1js.OctetString[]).map((p) => Buffer.from(p.valueBlock.valueHexView));
    return toAB(Buffer.concat(parts));
  }
  return toAB(Buffer.from(eContent.valueBlock.valueHexView));
}

function certInfo(cert: pkijs.Certificate): CertificateInfo {
  const spkiAlg = cert.subjectPublicKeyInfo.algorithm.algorithmId;
  let keySize: number | null = null;
  try {
    const parsed = cert.subjectPublicKeyInfo.parsedKey;
    if (parsed instanceof pkijs.RSAPublicKey) {
      const mod = Buffer.from(parsed.modulus.valueBlock.valueHexView);
      let i = 0;
      while (i < mod.length && mod[i] === 0) i++;
      keySize = (mod.length - i) * 8;
    } else if (parsed instanceof pkijs.ECPublicKey) {
      keySize = CURVE_BITS[parsed.namedCurve] ?? null;
    } else if (spkiAlg === "1.3.101.112") {
      keySize = 256;
    }
  } catch {
    keySize = null;
  }

  const kuExt = cert.extensions?.find((e) => e.extnID === OID.keyUsage);
  const keyUsage: string[] = [];
  if (kuExt) {
    const bits = Buffer.from((kuExt.parsedValue as asn1js.BitString).valueBlock.valueHexView);
    for (let i = 0; i < KEY_USAGE_NAMES.length; i++) {
      const byte = bits[i >> 3] ?? 0;
      if (byte & (0x80 >> (i & 7))) keyUsage.push(KEY_USAGE_NAMES[i]);
    }
  }
  const ekuExt = cert.extensions?.find((e) => e.extnID === OID.extKeyUsage);
  const extendedKeyUsage = ekuExt
    ? ((ekuExt.parsedValue as pkijs.ExtKeyUsage).keyPurposes ?? []).map((oid) => EKU_NAMES[oid] ?? oid)
    : [];
  const bcExt = cert.extensions?.find((e) => e.extnID === OID.basicConstraints);
  const isCA = !!(bcExt?.parsedValue as pkijs.BasicConstraints | undefined)?.cA;

  return {
    subject: rdnToString(cert.subject),
    issuer: rdnToString(cert.issuer),
    commonName: commonName(cert.subject) ?? "",
    serialNumber: Buffer.from(cert.serialNumber.valueBlock.valueHexView).toString("hex"),
    validFrom: cert.notBefore.value.toISOString(),
    validTo: cert.notAfter.value.toISOString(),
    signatureAlgorithm: SIG_ALG_NAMES[cert.signatureAlgorithm.algorithmId] ?? cert.signatureAlgorithm.algorithmId,
    publicKeyAlgorithm: PUBKEY_NAMES[spkiAlg] ?? spkiAlg,
    keySize,
    version: cert.version + 1,
    keyUsage,
    extendedKeyUsage,
    isCA,
    selfSigned: cert.subject.isEqual(cert.issuer),
    sha256Fingerprint: fingerprint(cert),
  };
}

function commonName(rdn: pkijs.RelativeDistinguishedNames): string | null {
  const cn = rdn.typesAndValues.find((tv) => tv.type === OID.CN);
  return cn ? String(cn.value.valueBlock.value) : null;
}

function fingerprint(cert: pkijs.Certificate): string {
  return createHash("sha256")
    .update(Buffer.from(cert.toSchema(true).toBER(false)))
    .digest("hex")
    .toUpperCase()
    .match(/.{2}/g)!
    .join(":");
}

function asn1Time(value: asn1js.BaseBlock): Date | null {
  if (value instanceof asn1js.UTCTime || value instanceof asn1js.GeneralizedTime) return value.toDate();
  return null;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function toAB(buf: Buffer | Uint8Array): ArrayBuffer {
  const u8 = Buffer.from(buf);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
}
