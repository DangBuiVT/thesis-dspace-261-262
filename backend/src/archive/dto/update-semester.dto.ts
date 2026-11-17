import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateSemesterDto {
  @ApiPropertyOptional({ example: "Học kỳ 1 năm học 2026-2027", minLength: 2 })
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @ApiPropertyOptional({ enum: ["active", "inactive"] })
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive";
}
