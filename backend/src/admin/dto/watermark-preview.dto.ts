import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class WatermarkPreviewDto {
  @IsOptional()
  @IsIn(["margin_strips", "diagonal", "invisible"])
  style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pages?: string;
}
