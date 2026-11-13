/**
 * Khởi tạo PKI ký lưu chiểu.
 *
 *   npm run pki:init            # chỉ tạo nếu chưa có
 *   npm run pki:init -- --force # chuyển bộ cũ vào uploads/pki/backup-<thời gian>/ rồi tạo mới
 */
import { existsSync, mkdirSync, readdirSync, renameSync } from "node:fs";
import * as path from "node:path";
import { generateInstitutionalPki } from "./pki-generator";

async function main() {
  const dir = path.resolve(process.cwd(), "uploads", "pki");
  const force = process.argv.includes("--force");
  const existing = existsSync(dir) ? readdirSync(dir).filter((name) => !name.startsWith("backup-")) : [];

  if (existing.length > 0) {
    if (!force) {
      console.log(`Đã có PKI tại ${dir}. Dùng --force để tạo bộ mới (bộ cũ được sao lưu).`);
      return;
    }
    const backup = path.join(dir, `backup-${new Date().toISOString().replace(/[:.]/g, "-")}`);
    mkdirSync(backup, { recursive: true });
    for (const name of existing) renameSync(path.join(dir, name), path.join(backup, name));
    console.log(`Đã chuyển bộ cũ vào ${backup}`);
  }

  const files = await generateInstitutionalPki(dir);
  console.log("Đã tạo PKI:");
  for (const [k, v] of Object.entries(files)) console.log(`  ${k.padEnd(15)} ${v}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
