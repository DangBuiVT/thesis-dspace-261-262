import { ApiProperty } from "@nestjs/swagger";

export class SemesterResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  facultyId!: string;

  @ApiProperty({ example: "Học kỳ 1 năm học 2026-2027" })
  name!: string;

  @ApiProperty({ enum: ["active", "inactive"] })
  status!: string;

  @ApiProperty({ example: 0 })
  periodCount!: number;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: string;
}

export class SemesterDetailResponseDto extends SemesterResponseDto {
  @ApiProperty({ example: 0 })
  submissionCount!: number;
}

class CreatedFacultySemesterDto {
  @ApiProperty({ format: "uuid" })
  facultyId!: string;

  @ApiProperty({ example: "Khoa Khoa học và Kỹ thuật Máy tính" })
  facultyName!: string;

  @ApiProperty({ format: "uuid" })
  semesterId!: string;
}

class SkippedFacultySemesterDto {
  @ApiProperty({ format: "uuid" })
  facultyId!: string;

  @ApiProperty({ example: "Khoa Khoa học và Kỹ thuật Máy tính" })
  facultyName!: string;

  @ApiProperty({ example: "already exists" })
  reason!: string;
}

export class CreateSemesterForAllResponseDto {
  @ApiProperty({ example: 1 })
  createdCount!: number;

  @ApiProperty({ example: 0 })
  skippedCount!: number;

  @ApiProperty({ type: [CreatedFacultySemesterDto] })
  created!: CreatedFacultySemesterDto[];

  @ApiProperty({ type: [SkippedFacultySemesterDto] })
  skipped!: SkippedFacultySemesterDto[];
}
