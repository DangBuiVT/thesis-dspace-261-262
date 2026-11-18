import { Injectable, Logger, InternalServerErrorException } from "@nestjs/common";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import { webcrypto } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";

const RSA_KEYGEN = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
};
const RSA_IMPORT = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };

const OID_CN = "2.5.4.3";
const OID_O = "2.5.4.10";
const OID_C = "2.5.4.6";
const OID_BASIC_CONSTRAINTS = "2.5.29.19";
const OID_KEY_USAGE = "2.5.29.15";

export interface SigningIdentity {
  privateKey: CryptoKey;
  /** DER của chứng thư ký (leaf). */
  leafDer: ArrayBuffer;
  /** DER của các chứng thư CA, đưa vào CMS để người xác minh dựng được chuỗi tin cậy. */
  chainDer: ArrayBuffer[];
  /** Serial dạng hex của chứng thư ký. */
  serialHex: string;
  subject: string;
  issuer: string;
  /** true nếu là CA nội bộ tự sinh (chỉ dùng cho môi trường phát triển). */
  devGenerated: boolean;
}

/**
 * Quản lý khóa RSA và chứng thư số dùng để ký PDF.
 *
 * Cấu hình qua biến môi trường (mặc định trong backend/uploads/pki):
 *  - SIGNING_KEY_PATH   : khóa riêng PKCS#8 PEM
 *  - SIGNING_CERT_PATH  : chứng thư ký PEM
 *  - SIGNING_CHAIN_PATH : (tùy chọn) chứng thư CA PEM (có thể nhiều khối)
 *
 * Nếu chưa có file và NODE_ENV != production, sinh CA nội bộ + chứng thư ký (RSA 2048).
 * Ở production bắt buộc phải cung cấp khóa và chứng thư.
 */
@Injectable()
export class PkiService {
  private readonly logger = new Logger(PkiService.name);
  private identityPromise: Promise<SigningIdentity> | null = null;

  identity(): Promise<SigningIdentity> {
    if (!this.identityPromise) {
      this.identityPromise = this.load().catch((error) => {
        this.identityPromise = null;
        throw error;
      });
    }
    return this.identityPromise;
  }

  private paths() {
    const dir = path.resolve(process.cwd(), "uploads", "pki");
    return {
      dir,
      key: process.env.SIGNING_KEY_PATH || path.join(dir, "signing-key.pem"),
      cert: process.env.SIGNING_CERT_PATH || path.join(dir, "signing-cert.pem"),
      chain: process.env.SIGNING_CHAIN_PATH || path.join(dir, "ca-cert.pem"),
    };
  }

  private async load(): Promise<SigningIdentity> {
    const p = this.paths();
    if (!existsSync(p.key) || !existsSync(p.cert)) {
      if (process.env.NODE_ENV === "production") {
        throw new InternalServerErrorException(
          "Chưa cấu hình chứng thư số để ký (SIGNING_KEY_PATH / SIGNING_CERT_PATH)."
        );
      }
      await this.generateDevPki(p);
    }
    const devGenerated = existsSync(p.chain) && readFileSync(p.chain, "utf8").includes("DEV CA");

    const keyDer = pemToDer(readFileSync(p.key, "utf8"), "PRIVATE KEY");
    const privateKey = await webcrypto.subtle.importKey("pkcs8", keyDer, RSA_IMPORT, false, ["sign"]);

    const certPems = pemBlocks(readFileSync(p.cert, "utf8"), "CERTIFICATE");
    if (certPems.length === 0) {
      throw new InternalServerErrorException("File chứng thư ký không hợp lệ.");
    }
    const leafDer = pemToDer(certPems[0], "CERTIFICATE");
    const leaf = pkijs.Certificate.fromBER(leafDer);

    const chainDer: ArrayBuffer[] = [];
    if (existsSync(p.chain)) {
      for (const pem of pemBlocks(readFileSync(p.chain, "utf8"), "CERTIFICATE")) {
        chainDer.push(pemToDer(pem, "CERTIFICATE"));
      }
    }
    for (const pem of certPems.slice(1)) {
      chainDer.push(pemToDer(pem, "CERTIFICATE"));
    }

    return {
      privateKey,
      leafDer,
      chainDer,
      serialHex: Buffer.from(leaf.serialNumber.valueBlock.valueHexView).toString("hex"),
      subject: rdnToString(leaf.subject),
      issuer: rdnToString(leaf.issuer),
      devGenerated,
    };
  }

  private async generateDevPki(p: ReturnType<PkiService["paths"]>) {
    this.logger.warn(
      "Chưa có chứng thư ký: sinh CA nội bộ cho môi trường phát triển (KHÔNG dùng cho production)."
    );
    mkdirSync(p.dir, { recursive: true });
    const notBefore = new Date();
    const notAfter = new Date(notBefore.getTime() + 10 * 365 * 24 * 3600 * 1000);

    // CA gốc (tự ký)
    const caKeys = await webcrypto.subtle.generateKey(RSA_KEYGEN, true, ["sign", "verify"]);
    const caSubject = makeRdn([
      [OID_CN, "BKlib DEV Root CA (KHONG DUNG CHO PRODUCTION)"],
      [OID_O, "Truong Dai hoc Bach Khoa TP.HCM (dev)"],
      [OID_C, "VN"],
    ]);
    const caCert = new pkijs.Certificate();
    caCert.version = 2;
    caCert.serialNumber = new asn1js.Integer({ value: 1 });
    caCert.subject = caSubject;
    caCert.issuer = caSubject;
    caCert.notBefore.value = notBefore;
    caCert.notAfter.value = notAfter;
    await caCert.subjectPublicKeyInfo.importKey(caKeys.publicKey);
    caCert.extensions = [
      basicConstraints(true, true),
      keyUsage(0x06), // keyCertSign | cRLSign
    ];
    await caCert.sign(caKeys.privateKey, "SHA-256");

    // Chứng thư ký (do CA ký)
    const leafKeys = await webcrypto.subtle.generateKey(RSA_KEYGEN, true, ["sign", "verify"]);
    const leafCert = new pkijs.Certificate();
    leafCert.version = 2;
    const serial = webcrypto.getRandomValues(new Uint8Array(16));
    serial[0] &= 0x7f; // số nguyên DER dương
    leafCert.serialNumber = new asn1js.Integer({ valueHex: serial.buffer as ArrayBuffer });
    leafCert.subject = makeRdn([
      [OID_CN, "BKlib Signing (dev)"],
      [OID_O, "Truong Dai hoc Bach Khoa TP.HCM (dev)"],
      [OID_C, "VN"],
    ]);
    leafCert.issuer = caCert.subject;
    leafCert.notBefore.value = notBefore;
    leafCert.notAfter.value = notAfter;
    await leafCert.subjectPublicKeyInfo.importKey(leafKeys.publicKey);
    leafCert.extensions = [
      basicConstraints(false, false),
      keyUsage(0x80 | 0x40), // digitalSignature | nonRepudiation
    ];
    await leafCert.sign(caKeys.privateKey, "SHA-256");

    const keyPkcs8 = await webcrypto.subtle.exportKey("pkcs8", leafKeys.privateKey);
    writeFileSync(p.key, derToPem(keyPkcs8, "PRIVATE KEY"), { mode: 0o600 });
    writeFileSync(p.cert, derToPem(leafCert.toSchema(true).toBER(false), "CERTIFICATE"));
    writeFileSync(
      p.chain,
      `# DEV CA - không dùng cho production\n${derToPem(caCert.toSchema(true).toBER(false), "CERTIFICATE")}`
    );
  }
}

function makeRdn(entries: Array<[string, string]>): pkijs.RelativeDistinguishedNames {
  return new pkijs.RelativeDistinguishedNames({
    typesAndValues: entries.map(
      ([type, value]) =>
        new pkijs.AttributeTypeAndValue({
          type,
          value: new asn1js.PrintableString({ value }),
        })
    ),
  });
}

function basicConstraints(isCA: boolean, critical: boolean): pkijs.Extension {
  return new pkijs.Extension({
    extnID: OID_BASIC_CONSTRAINTS,
    critical,
    extnValue: new pkijs.BasicConstraints({ cA: isCA }).toSchema().toBER(false),
  });
}

/** KeyUsage: `flags` là byte đầu tiên của BIT STRING (bit 0 = digitalSignature, bit 5 = keyCertSign...). */
function keyUsage(flags: number): pkijs.Extension {
  const bits = new asn1js.BitString({ valueHex: new Uint8Array([flags]).buffer as ArrayBuffer });
  return new pkijs.Extension({
    extnID: OID_KEY_USAGE,
    critical: true,
    extnValue: bits.toBER(false),
  });
}

function rdnToString(rdn: pkijs.RelativeDistinguishedNames): string {
  const names: Record<string, string> = { [OID_CN]: "CN", [OID_O]: "O", [OID_C]: "C", "2.5.4.11": "OU", "2.5.4.7": "L" };
  return rdn.typesAndValues
    .map((tv) => `${names[tv.type] ?? tv.type}=${String(tv.value.valueBlock.value)}`)
    .join(", ");
}

function pemBlocks(pem: string, label: string): string[] {
  const re = new RegExp(`-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(pem))) {
    out.push(`-----BEGIN ${label}-----${m[1]}-----END ${label}-----`);
  }
  return out;
}

function pemToDer(pem: string, label: string): ArrayBuffer {
  const body = pemBlocks(pem, label)[0];
  if (!body) throw new InternalServerErrorException(`Dữ liệu ${label} không hợp lệ.`);
  const b64 = body.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const buf = Buffer.from(b64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function derToPem(der: ArrayBuffer | Uint8Array | Buffer, label: string): string {
  const b64 = Buffer.from(der as ArrayBuffer).toString("base64").match(/.{1,64}/g)!.join("\n");
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----\n`;
}
