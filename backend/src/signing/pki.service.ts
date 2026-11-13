import { Injectable, Logger, InternalServerErrorException } from "@nestjs/common";
import * as pkijs from "pkijs";
import { webcrypto } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { generateInstitutionalPki } from "./pki-generator";

const RSA_IMPORT = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };

const OID_CN = "2.5.4.3";
const OID_O = "2.5.4.10";
const OID_C = "2.5.4.6";

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
 *  - SIGNING_CHAIN_PATH : (tùy chọn) chứng thư CA trung gian + gốc PEM (nhúng vào chữ ký)
 *  - SIGNING_TRUST_PATH : (tùy chọn) các Root CA được tin cậy khi kiểm tra chữ ký (PEM, nhiều khối)
 *
 * Nếu chưa có file và NODE_ENV != production, tự sinh PKI nội bộ 3 tầng
 * (Root CA → Document Signing CA → chứng thư ký) — xem pki-generator.ts.
 * Ở production bắt buộc phải cung cấp khóa và chứng thư (hoặc chạy `npm run pki:init` một lần).
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
      chain:
        process.env.SIGNING_CHAIN_PATH ||
        // Bố cục cũ chỉ có ca-cert.pem (CA gốc dùng luôn làm chuỗi).
        (existsSync(path.join(dir, "ca-chain.pem")) ? path.join(dir, "ca-chain.pem") : path.join(dir, "ca-cert.pem")),
      trust: process.env.SIGNING_TRUST_PATH || path.join(dir, "ca-cert.pem"),
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
      this.logger.warn(`Chưa có chứng thư ký: sinh PKI nội bộ tại ${p.dir}`);
      await generateInstitutionalPki(p.dir);
      return this.load();
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

  /**
   * Các Root CA được tin cậy khi kiểm tra chữ ký: file SIGNING_TRUST_PATH cộng với
   * chứng thư tự ký trong chuỗi của chính hệ thống.
   */
  async trustAnchors(): Promise<pkijs.Certificate[]> {
    const p = this.paths();
    const ders: ArrayBuffer[] = [];
    if (existsSync(p.trust)) {
      for (const pem of pemBlocks(readFileSync(p.trust, "utf8"), "CERTIFICATE")) ders.push(pemToDer(pem, "CERTIFICATE"));
    }
    try {
      const id = await this.identity();
      ders.push(...id.chainDer);
    } catch {
      /* chưa cấu hình khóa ký: chỉ dùng file trust */
    }
    const seen = new Set<string>();
    const anchors: pkijs.Certificate[] = [];
    for (const der of ders) {
      const cert = pkijs.Certificate.fromBER(der);
      if (!isSelfIssued(cert)) continue;
      const key = Buffer.from(der).toString("base64");
      if (seen.has(key)) continue;
      seen.add(key);
      anchors.push(cert);
    }
    return anchors;
  }

  /** Nội dung PEM của Root CA (trust anchor) để người dùng tải về và cài đặt. */
  trustAnchorPem(): string | null {
    const p = this.paths();
    if (!existsSync(p.trust)) return null;
    return pemBlocks(readFileSync(p.trust, "utf8"), "CERTIFICATE").join("\n") + "\n";
  }
}

function isSelfIssued(cert: pkijs.Certificate): boolean {
  return cert.subject.isEqual(cert.issuer);
}

export function rdnToString(rdn: pkijs.RelativeDistinguishedNames): string {
  const names: Record<string, string> = {
    [OID_CN]: "CN",
    [OID_O]: "O",
    [OID_C]: "C",
    "2.5.4.11": "OU",
    "2.5.4.7": "L",
    "2.5.4.8": "ST",
    "2.5.4.5": "SERIALNUMBER",
    "0.9.2342.19200300.100.1.1": "UID",
    "1.2.840.113549.1.9.1": "E",
  };
  // Hiển thị theo thứ tự quen thuộc: CN trước, C sau cùng.
  const order = ["CN", "OU", "O", "L", "ST", "C"];
  const rank = (label: string) => (order.indexOf(label) < 0 ? order.length : order.indexOf(label));
  return rdn.typesAndValues
    .map((tv) => ({ label: names[tv.type] ?? tv.type, value: String(tv.value.valueBlock.value) }))
    .sort((a, b) => rank(a.label) - rank(b.label))
    .map((x) => `${x.label}=${x.value}`)
    .join(", ");
}

export function pemBlocks(pem: string, label: string): string[] {
  const re = new RegExp(`-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(pem))) {
    out.push(`-----BEGIN ${label}-----${m[1]}-----END ${label}-----`);
  }
  return out;
}

export function pemToDer(pem: string, label: string): ArrayBuffer {
  const body = pemBlocks(pem, label)[0];
  if (!body) throw new InternalServerErrorException(`Dữ liệu ${label} không hợp lệ.`);
  const b64 = body.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const buf = Buffer.from(b64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}
