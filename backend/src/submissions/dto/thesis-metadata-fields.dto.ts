import { Transform } from "class-transformer";
import { IsArray, IsIn, IsObject, IsOptional, IsString } from "class-validator";

export class ThesisMetadataFieldsDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  titleVi?: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  /** @deprecated use titleEn */
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  thesisAdvisors?: string;

  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsString()
  thesisYear?: string;

  @IsOptional()
  @IsString()
  dateIssued?: string;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Dynamic / custom form field values (JSON object or JSON string for multipart). */
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === "") {
      return undefined;
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value) as unknown;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
    return {};
  })
  @IsObject()
  metadata?: Record<string, string>;

  // ── Tuỳ chọn chỉ dành cho Admin khi nộp thay sinh viên ──

  /** Khoa của bài nộp (có thể khác khoa trong hồ sơ sinh viên). */
  @IsOptional()
  @IsString()
  facultyId?: string;

  /** Tên khoa nhập tay khi Admin chọn "Khác". */
  @IsOptional()
  @IsString()
  facultyOtherName?: string;

  /**
   * Các bước duyệt được bật cho bài nộp này, JSON array con của
   * ["reviewer","library_staff","director"]. Mảng rỗng = không cần duyệt (tự lưu chiểu + ký số).
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === "") {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value.map(String);
    }
    try {
      const parsed = JSON.parse(String(value)) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : undefined;
    } catch {
      return undefined;
    }
  })
  @IsArray()
  @IsIn(["reviewer", "library_staff", "director"], { each: true })
  workflowRoles?: string[];

  /** Kiểu chữ ký số dùng khi bài được tự lưu chiểu (không có bước duyệt). */
  @IsOptional()
  @IsIn(["margin_strips", "diagonal", "invisible"])
  signatureStyle?: string;
}
