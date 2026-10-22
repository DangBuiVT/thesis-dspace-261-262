import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";

export class ReviewActionDto {
  @IsString()
  @IsNotEmpty()
  submissionId!: string;

  @IsString()
  @IsIn(["approve", "reject", "archive"])
  action!: "approve" | "reject" | "archive";

  @IsString()
  @IsOptional()
  comment?: string;

  @IsObject()
  @IsOptional()
  metadata?: {
    title?: string;
    titleVi?: string;
    titleEn?: string;
    thesisAdvisors?: string;
    major?: string;
    thesisYear?: string;
    abstract?: string;
    keywords?: string;
    publisher?: string;
    language?: string;
    documentType?: string;
    description?: string;
    extraMetadata?: Record<string, string>;
  };
}
