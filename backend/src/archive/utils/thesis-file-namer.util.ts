/**
 * Utility to format standardized thesis file names for archival and export.
 * Follows instructor feedback: concise naming consisting of Student ID (MSSV) and Submitter Full Name,
 * because higher-level hierarchy (Faculty, Semester, Submission Period) is already separated into collections in DSpace.
 *
 * Example outputs:
 *  - 2110123_Nguyen_Van_A.pdf
 *  - student1_Student_Alpha.pdf
 *  - 2110123_Nguyen_Van_A_attachment.zip
 */

export interface ThesisNamingInput {
  submitterId?: string | null;
  submitterName?: string | null;
  thesisYear?: string | null;
  dateIssued?: string | null;
  semesterName?: string | null;
  facultyName?: string | null;
  authorIds?: string[] | null;
  fileType?: "thesis" | "attachment" | string;
  originalFileName?: string | null;
}

/**
 * Normalizes Vietnamese diacritics and converts to clean ASCII.
 */
function removeVietnameseDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Normalizes a person's display name to clean ASCII underscore format (e.g. "Nguyễn Văn A" -> "Nguyen_Van_A").
 */
export function normalizePersonName(name?: string | null): string {
  if (!name || !name.trim()) return "";
  const clean = removeVietnameseDiacritics(name.trim());
  return clean
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Normalizes semester name to standard university code (e.g. HK241, HK242, HK243, HK1, HK2, HK3).
 * University rule (e.g. HCMUT):
 *  - Học kỳ 1 2024-2025 -> HK241
 *  - Học kỳ 2 2024-2025 -> HK242
 *  - Học kỳ hè 2024-2025 (Học kỳ 3) -> HK243
 *  - HK243 -> HK243
 *  - Học kỳ hè (không có năm) -> HK3 (hoặc kết hợp với fallbackYear -> HK243)
 */
export function normalizeSemesterCode(
  rawName?: string | null,
  fallbackYear?: string | null
): string {
  if (!rawName || !rawName.trim()) {
    return "HK";
  }

  const clean = removeVietnameseDiacritics(rawName.trim());

  // 1. Direct code like HK251, HK243, HK261, HK242
  const directCodeMatch = clean.match(/\bHK\s*(\d{3,4})\b/i);
  if (directCodeMatch) {
    return `HK${directCodeMatch[1]}`;
  }

  // 2. Determine semester term number (1, 2, or 3 for summer/hè/học kỳ 3)
  let termNum: string | null = null;
  if (/Hoc\s*ky\s*he|HK\s*he|\bhe\b/i.test(clean) || /(?:Hoc\s*ky|HK)\s*3\b/i.test(clean)) {
    termNum = "3";
  } else {
    const termMatch = clean.match(/(?:Hoc\s*ky|HK)\s*(\d+)/i);
    if (termMatch) {
      termNum = termMatch[1];
    }
  }

  // 3. Extract 2-digit academic starting year (e.g. "2024" in "2024-2025" -> "24")
  let year2Digits: string | null = null;
  const yearMatch = clean.match(/20(\d{2})/);
  if (yearMatch) {
    year2Digits = yearMatch[1];
  } else if (fallbackYear && fallbackYear.trim()) {
    const fbMatch = fallbackYear.match(/20(\d{2})/);
    if (fbMatch) {
      year2Digits = fbMatch[1];
    }
  }

  // 4. If we found a valid term number
  if (termNum) {
    if (year2Digits) {
      return `HK${year2Digits}${termNum}`;
    }
    return `HK${termNum}`;
  }

  // Fallback: extract alphanumeric characters, max 10 chars
  const fallback = clean.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return fallback.slice(0, 10) || "HK";
}

/**
 * Maps faculty name to standard international university abbreviation at HCMUT.
 * 11 official faculties:
 *  - Khoa Khoa học và Kỹ thuật Máy tính -> CSE
 *  - Khoa Điện - Điện tử -> EEE
 *  - Khoa Cơ khí -> ME
 *  - Khoa Kỹ thuật Xây dựng -> CE
 *  - Khoa Kỹ thuật Hóa học -> CHE
 *  - Khoa Quản lý Công nghiệp -> SIM
 *  - Khoa Công nghệ Vật liệu -> FMT
 *  - Khoa Khoa học Ứng dụng -> FAS
 *  - Khoa Kỹ thuật Địa chất và Dầu khí -> GEOPETRO
 *  - Khoa Kỹ thuật Giao thông -> FTE
 *  - Khoa Môi trường và Tài nguyên -> FENR
 *
 * Fallback (for custom faculty/center created by Admin):
 *  - Extracts acronym of words (e.g. "Viện Bán Dẫn Quốc Tế" -> "VBDQT")
 *  - Preserves short codes (e.g. "AI" -> "AI")
 */
export function normalizeFacultyCode(rawFaculty?: string | null): string {
  if (!rawFaculty || !rawFaculty.trim()) {
    return "";
  }

  const clean = removeVietnameseDiacritics(rawFaculty.trim());

  // 1. Direct code check
  if (/\bCSE\b/i.test(clean)) return "CSE";
  if (/\bEEE\b/i.test(clean)) return "EEE";
  if (/\bME\b/i.test(clean)) return "ME";
  if (/\bCE\b/i.test(clean)) return "CE";
  if (/\bCHE\b/i.test(clean)) return "CHE";
  if (/\bSIM\b/i.test(clean)) return "SIM";
  if (/\bFMT\b/i.test(clean)) return "FMT";
  if (/\bFAS\b/i.test(clean)) return "FAS";
  if (/\bGEOPETRO\b/i.test(clean)) return "GEOPETRO";
  if (/\bFTE\b/i.test(clean)) return "FTE";
  if (/\bFENR\b/i.test(clean)) return "FENR";

  // 2. Keyword matching for HCMUT 11 official faculties
  // Computer Science & Engineering
  if (/\bmay\s*tinh\b|computer\s*science/i.test(clean)) return "CSE";
  // Electrical & Electronics
  if (/\bdien\s*-\s*dien\s*tu\b|\bdien\s*dien\s*tu\b|electrical/i.test(clean)) return "EEE";
  // Mechanical Engineering
  if (/\bco\s*khi\b|mechanical/i.test(clean)) return "ME";
  // Civil Engineering
  if (/\bxay\s*dung\b|civil\s*engineering/i.test(clean)) return "CE";
  // Applied Science (Check before chemical to avoid any ambiguity)
  if (/\bung\s*dung\b|applied\s*science/i.test(clean)) return "FAS";
  // Chemical Engineering (\bhoa\s*hoc\b ensures it does not match "khoa hoc")
  if (/\bky\s*thuat\s*hoa\s*hoc\b|\bhoa\s*hoc\b|chemical\s*engineering/i.test(clean)) return "CHE";
  // Industrial Management
  if (/\bquan\s*ly\s*cong\s*nghiep\b|industrial\s*management/i.test(clean)) return "SIM";
  // Materials Technology
  if (/\bcong\s*nghe\s*vat\s*lieu\b|\bvat\s*lieu\b|materials/i.test(clean)) return "FMT";
  // Geology & Petroleum Engineering
  if (/\bdia\s*chat\b|\bdau\s*khi\b|geology|petroleum/i.test(clean)) return "GEOPETRO";
  // Transportation Engineering
  if (/\bky\s*thuat\s*giao\s*thong\b|\bgiao\s*thong\b|transportation/i.test(clean)) return "FTE";
  // Environment and Natural Resources
  if (/\bmoi\s*truong\b|\btai\s*nguyen\b|environment/i.test(clean)) return "FENR";

  // 3. Fallback for custom Admin input
  const stripped = clean.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (stripped.length >= 2 && stripped.length <= 8) {
    return stripped;
  }

  // Extract acronym from words (excluding generic words "Khoa", "Vien", "Bo mon")
  const words = clean
    .replace(/\b(khoa|bo\s*mon|faculty\s*of|department\s*of|school\s*of)\b/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length > 0) {
    const acronym = words.map((w) => w[0].toUpperCase()).join("");
    return acronym.slice(0, 8);
  }

  return stripped.slice(0, 8) || "";
}

/**
 * Extracts a 4-digit graduation / academic year.
 */
export function extractThesisYear(
  thesisYear?: string | null,
  dateIssued?: string | null
): string {
  if (thesisYear && thesisYear.trim()) {
    const match = thesisYear.match(/\b(20\d{2}|19\d{2})\b/);
    if (match) {
      return match[1];
    }
  }

  if (dateIssued && dateIssued.trim()) {
    const match = dateIssued.match(/\b(20\d{2}|19\d{2})\b/);
    if (match) {
      return match[1];
    }
  }

  return new Date().getFullYear().toString();
}

/**
 * Cleans student ID string (MSSV), stripping invalid filename characters.
 */
function cleanStudentId(id: string): string {
  return id
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "");
}

/**
 * Builds standard DSpace bitstream filename according to instructor feedback:
 * Format: ${studentId}_${normalizedName}${ext}
 * Example: 2110123_Nguyen_Van_A.pdf (hoặc student1_Student_Alpha.pdf)
 *
 * Higher-level metadata (Faculty, Semester, Submission Period) is already separated
 * into individual Communities and Collections on DSpace.
 */
export function formatStandardDspaceFileName(input: ThesisNamingInput): string {
  const studentId = input.submitterId ? cleanStudentId(input.submitterId) : "student";
  const rawName = input.submitterName?.trim();
  const normalizedName = rawName ? normalizePersonName(rawName) : "";

  // Determine extension
  let ext = ".pdf";
  if (input.originalFileName && input.originalFileName.includes(".")) {
    const lastDot = input.originalFileName.lastIndexOf(".");
    const originalExt = input.originalFileName.slice(lastDot).toLowerCase();
    if (originalExt.length <= 6) {
      ext = originalExt;
    }
  }

  const fileTypeTag = input.fileType?.trim() ? input.fileType.trim().toLowerCase() : "thesis";

  // Build concise name: [MSSV]_[Ho_Ten]
  const parts: string[] = [];
  if (studentId) {
    parts.push(studentId);
  }
  if (normalizedName) {
    parts.push(normalizedName);
  } else if (!studentId) {
    parts.push("student");
  }

  // If this is an attachment file (not thesis PDF), append the tag
  if (fileTypeTag && fileTypeTag !== "thesis") {
    parts.push(fileTypeTag);
  }

  return `${parts.join("_")}${ext}`;
}
