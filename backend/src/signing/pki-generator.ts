import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import { createHash, webcrypto } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";

/**
 * Sinh hạ tầng khóa công khai (PKI) nội bộ 3 tầng cho việc ký lưu chiểu:
 *
 *   Root CA (tự ký, RSA 4096, 20 năm)
 *     └─ Issuing CA "Document Signing CA" (RSA 3072, 10 năm, pathLen 0)
 *          └─ Chứng thư ký tài liệu (RSA 3072, 3 năm, digitalSignature + nonRepudiation,
 *             EKU documentSigning)
 *
 * Mọi chứng thư dùng X.509 v3 với đủ phần mở rộng chuẩn RFC 5280: BasicConstraints,
 * KeyUsage, ExtendedKeyUsage, SubjectKeyIdentifier, AuthorityKeyIdentifier.
 * Mỗi thuộc tính của tên phân biệt (DN) nằm trong một RDN riêng
 * (CN=..., OU=..., O=..., L=..., C=VN), giống chứng thư của các CA thương mại.
 */

const OID = {
  CN: "2.5.4.3",
  OU: "2.5.4.11",
  O: "2.5.4.10",
  L: "2.5.4.7",
  ST: "2.5.4.8",
  C: "2.5.4.6",
  basicConstraints: "2.5.29.19",
  keyUsage: "2.5.29.15",
  extKeyUsage: "2.5.29.37",
  subjectKeyIdentifier: "2.5.29.14",
  authorityKeyIdentifier: "2.5.29.35",
  // id-kp-documentSigning (RFC 9336) và Microsoft Document Signing (Adobe/Windows nhận diện)
  kpDocumentSigning: "1.3.6.1.5.5.7.3.36",
  msDocumentSigning: "1.3.6.1.4.1.311.10.3.12",
  kpEmailProtection: "1.3.6.1.5.5.7.3.4",
};

function addYears(date: Date, years: number): Date {
  const d = new Date(date.getTime());
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
}

export interface PkiNames {
  organization: string;
  organizationalUnit: string;
  locality: string;
  province: string;
  country: string;
  rootCommonName: string;
  issuingCommonName: string;
  signerCommonName: string;
}

export function defaultPkiNames(env: NodeJS.ProcessEnv = process.env): PkiNames {
  return {
    organization: env.PKI_ORGANIZATION || "Trường Đại học Bách Khoa - ĐHQG-HCM",
    organizationalUnit: env.PKI_ORGANIZATIONAL_UNIT || "Thư viện Trường Đại học Bách Khoa",
    locality: env.PKI_LOCALITY || "Thành phố Hồ Chí Minh",
    province: env.PKI_PROVINCE || "Hồ Chí Minh",
    country: env.PKI_COUNTRY || "VN",
    rootCommonName: env.PKI_ROOT_CN || "BKlib Root CA",
    issuingCommonName: env.PKI_ISSUING_CN || "BKlib Document Signing CA",
    signerCommonName: env.PKI_SIGNER_CN || "Thư viện Trường Đại học Bách Khoa - Lưu chiểu luận văn",
  };
}

export interface GeneratedPkiFiles {
  dir: string;
  signingKey: string;
  signingCert: string;
  chain: string;
  trustAnchor: string;
  trustAnchorDer: string;
}

/**
 * Tạo toàn bộ PKI và ghi ra `dir`:
 *  - signing-key.pem       khóa riêng của chứng thư ký (PKCS#8) — giữ bí mật
 *  - signing-cert.pem      chứng thư ký
 *  - ca-chain.pem          Issuing CA + Root CA (nhúng vào mỗi chữ ký để dựng chuỗi)
 *  - ca-cert.pem / .crt    Root CA (PEM / DER) — trust anchor để cài vào Windows, Adobe, Stirling
 *  - ca/                   khóa riêng của Root CA và Issuing CA (để cấp lại chứng thư ký);
 *                          ở môi trường thật nên chuyển khóa Root CA ra lưu trữ ngoại tuyến.
 */
export async function generateInstitutionalPki(
  dir: string,
  names: PkiNames = defaultPkiNames()
): Promise<GeneratedPkiFiles> {
  mkdirSync(path.join(dir, "ca"), { recursive: true });
  const now = new Date();
  // Lùi 5 phút để tránh lệch đồng hồ giữa các máy kiểm tra.
  const notBefore = new Date(now.getTime() - 5 * 60 * 1000);

  const base: Array<[string, string]> = [
    [OID.C, names.country],
    [OID.ST, names.province],
    [OID.L, names.locality],
    [OID.O, names.organization],
    [OID.OU, names.organizationalUnit],
  ];

  // 1) Root CA
  const rootKeys = await rsaKeys(4096);
  const rootName = makeName([...base, [OID.CN, names.rootCommonName]]);
  const rootSki = await keyIdentifier(rootKeys.publicKey);
  const root = await buildCert({
    subject: rootName,
    issuer: rootName,
    publicKey: rootKeys.publicKey,
    signingKey: rootKeys.privateKey,
    notBefore,
    notAfter: addYears(notBefore, 20),
    extensions: [
      basicConstraints(true, undefined),
      keyUsage(KU.keyCertSign | KU.cRLSign),
      subjectKeyId(rootSki),
    ],
  });

  // 2) Issuing CA
  const issuingKeys = await rsaKeys(3072);
  const issuingName = makeName([...base, [OID.CN, names.issuingCommonName]]);
  const issuingSki = await keyIdentifier(issuingKeys.publicKey);
  const issuing = await buildCert({
    subject: issuingName,
    issuer: rootName,
    publicKey: issuingKeys.publicKey,
    signingKey: rootKeys.privateKey,
    notBefore,
    notAfter: addYears(notBefore, 10),
    extensions: [
      basicConstraints(true, 0),
      keyUsage(KU.digitalSignature | KU.keyCertSign | KU.cRLSign),
      subjectKeyId(issuingSki),
      authorityKeyId(rootSki),
    ],
  });

  // 3) Chứng thư ký tài liệu
  const signerKeys = await rsaKeys(3072);
  const signerName = makeName([...base, [OID.CN, names.signerCommonName]]);
  const signerSki = await keyIdentifier(signerKeys.publicKey);
  const signer = await buildCert({
    subject: signerName,
    issuer: issuingName,
    publicKey: signerKeys.publicKey,
    signingKey: issuingKeys.privateKey,
    notBefore,
    notAfter: addYears(notBefore, 3),
    extensions: [
      basicConstraints(false, undefined),
      keyUsage(KU.digitalSignature | KU.nonRepudiation),
      extKeyUsage([OID.kpDocumentSigning, OID.msDocumentSigning, OID.kpEmailProtection]),
      subjectKeyId(signerSki),
      authorityKeyId(issuingSki),
    ],
  });

  const files: GeneratedPkiFiles = {
    dir,
    signingKey: path.join(dir, "signing-key.pem"),
    signingCert: path.join(dir, "signing-cert.pem"),
    chain: path.join(dir, "ca-chain.pem"),
    trustAnchor: path.join(dir, "ca-cert.pem"),
    trustAnchorDer: path.join(dir, "ca-cert.crt"),
  };
  const rootPem = certPem(root);
  const issuingPem = certPem(issuing);

  writeFileSync(files.signingKey, await keyPem(signerKeys.privateKey), { mode: 0o600 });
  writeFileSync(files.signingCert, certPem(signer));
  writeFileSync(files.chain, issuingPem + rootPem);
  writeFileSync(files.trustAnchor, rootPem);
  writeFileSync(files.trustAnchorDer, Buffer.from(root.toSchema(true).toBER(false)));
  writeFileSync(path.join(dir, "ca", "issuing-ca-cert.pem"), issuingPem);
  writeFileSync(path.join(dir, "ca", "issuing-ca-key.pem"), await keyPem(issuingKeys.privateKey), { mode: 0o600 });
  writeFileSync(path.join(dir, "ca", "root-ca-key.pem"), await keyPem(rootKeys.privateKey), { mode: 0o600 });
  return files;
}

const KU = {
  digitalSignature: 0x80,
  nonRepudiation: 0x40,
  keyEncipherment: 0x20,
  dataEncipherment: 0x10,
  keyAgreement: 0x08,
  keyCertSign: 0x04,
  cRLSign: 0x02,
};

async function rsaKeys(bits: number) {
  return webcrypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
      modulusLength: bits,
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ["sign", "verify"]
  ) as Promise<CryptoKeyPair>;
}

async function buildCert(opts: {
  subject: pkijs.RelativeDistinguishedNames;
  issuer: pkijs.RelativeDistinguishedNames;
  publicKey: CryptoKey;
  signingKey: CryptoKey;
  notBefore: Date;
  notAfter: Date;
  extensions: pkijs.Extension[];
}): Promise<pkijs.Certificate> {
  const cert = new pkijs.Certificate();
  cert.version = 2;
  cert.serialNumber = new asn1js.Integer({ valueHex: randomSerial() });
  cert.subject = opts.subject;
  cert.issuer = opts.issuer;
  cert.notBefore.value = opts.notBefore;
  cert.notAfter.value = opts.notAfter;
  // Sau năm 2049 RFC 5280 yêu cầu GeneralizedTime.
  if (opts.notAfter.getUTCFullYear() >= 2050) {
    cert.notAfter = new pkijs.Time({ type: 1, value: opts.notAfter });
  }
  await cert.subjectPublicKeyInfo.importKey(opts.publicKey);
  cert.extensions = opts.extensions;
  await cert.sign(opts.signingKey, "SHA-256");
  return cert;
}

/** Serial 20 byte ngẫu nhiên, dương (RFC 5280 §4.1.2.2). */
function randomSerial(): ArrayBuffer {
  const serial = webcrypto.getRandomValues(new Uint8Array(20));
  serial[0] = (serial[0] & 0x7f) | 0x01;
  return serial.buffer as ArrayBuffer;
}

/**
 * Tên phân biệt: mỗi thuộc tính là một RDN riêng.
 * pkijs gom tất cả typesAndValues vào một SET duy nhất (=> "CN=..+O=.."), nên tự dựng ASN.1.
 */
function makeName(entries: Array<[string, string]>): pkijs.RelativeDistinguishedNames {
  const seq = new asn1js.Sequence({
    value: entries.map(
      ([type, value]) =>
        new asn1js.Set({
          value: [
            new asn1js.Sequence({
              value: [
                new asn1js.ObjectIdentifier({ value: type }),
                type === OID.C
                  ? new asn1js.PrintableString({ value })
                  : new asn1js.Utf8String({ value }),
              ],
            }),
          ],
        })
    ),
  });
  // Đi qua BER để pkijs giữ nguyên cấu trúc (valueBeforeDecode) khi mã hóa lại.
  const parsed = asn1js.fromBER(seq.toBER(false));
  return new pkijs.RelativeDistinguishedNames({ schema: parsed.result });
}

/** SubjectKeyIdentifier theo RFC 5280 phương pháp 1: SHA-1 của BIT STRING khóa công khai. */
async function keyIdentifier(publicKey: CryptoKey): Promise<ArrayBuffer> {
  const spki = await webcrypto.subtle.exportKey("spki", publicKey);
  const info = pkijs.PublicKeyInfo.fromBER(spki);
  const keyBits = Buffer.from(info.subjectPublicKey.valueBlock.valueHexView);
  const digest = createHash("sha1").update(keyBits).digest();
  return digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength) as ArrayBuffer;
}

function ext(extnID: string, critical: boolean, value: asn1js.BaseBlock | { toSchema(): asn1js.BaseBlock }) {
  const schema = "toSchema" in value ? value.toSchema() : value;
  return new pkijs.Extension({ extnID, critical, extnValue: schema.toBER(false) });
}

function basicConstraints(isCA: boolean, pathLen: number | undefined) {
  const params: { cA: boolean; pathLenConstraint?: number } = { cA: isCA };
  if (isCA && pathLen !== undefined) params.pathLenConstraint = pathLen;
  return ext(OID.basicConstraints, true, new pkijs.BasicConstraints(params));
}

function keyUsage(flags: number) {
  // Số bit không dùng ở cuối (để DER chuẩn: bỏ bit 0 thừa).
  let unused = 0;
  while (unused < 7 && !(flags & (1 << unused))) unused++;
  return ext(
    OID.keyUsage,
    true,
    new asn1js.BitString({ valueHex: new Uint8Array([flags]).buffer as ArrayBuffer, unusedBits: unused })
  );
}

function extKeyUsage(purposes: string[]) {
  return ext(OID.extKeyUsage, false, new pkijs.ExtKeyUsage({ keyPurposes: purposes }));
}

function subjectKeyId(id: ArrayBuffer) {
  return ext(OID.subjectKeyIdentifier, false, new asn1js.OctetString({ valueHex: id }));
}

function authorityKeyId(id: ArrayBuffer) {
  return ext(
    OID.authorityKeyIdentifier,
    false,
    new pkijs.AuthorityKeyIdentifier({ keyIdentifier: new asn1js.OctetString({ valueHex: id }) })
  );
}

function certPem(cert: pkijs.Certificate): string {
  return derToPem(cert.toSchema(true).toBER(false), "CERTIFICATE");
}

async function keyPem(key: CryptoKey): Promise<string> {
  return derToPem(await webcrypto.subtle.exportKey("pkcs8", key), "PRIVATE KEY");
}

export function derToPem(der: ArrayBuffer | Uint8Array | Buffer, label: string): string {
  const b64 = Buffer.from(der as ArrayBuffer).toString("base64").match(/.{1,64}/g)!.join("\n");
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`;
}
