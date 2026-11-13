import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, MinLength } from "class-validator";

export class CreateSemesterDto {
  @ApiProperty({ description: "Tên học kỳ (sau khi bỏ khoảng trắng đầu/cuối)", example: "Học kỳ 1 năm học 2026-2027", minLength: 2 })
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @MinLength(2)
  name!: string;
}
