import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const PREFIX = "scrypt$";

export function isHashedPassword(stored: string | null | undefined): boolean {
  return Boolean(stored && stored.startsWith(PREFIX));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `${PREFIX}${salt.toString("hex")}$${key.toString("hex")}`;
}

/**
 * Kiểm tra mật khẩu. Hỗ trợ mật khẩu cũ lưu dạng plaintext (để tương thích dữ liệu hiện có);
 * AuthService sẽ nâng cấp sang bản băm sau khi đăng nhập thành công.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  if (!isHashedPassword(stored)) {
    return stored === password;
  }
  const [, saltHex, keyHex] = stored.split("$");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
