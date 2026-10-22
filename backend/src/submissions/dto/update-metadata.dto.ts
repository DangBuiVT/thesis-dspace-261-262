import { IsOptional, isString, IsString } from "class-validator";
import { ThesisMetadataFieldsDto } from "./thesis-metadata-fields.dto";

export class UpdateMetadataDto extends ThesisMetadataFieldsDto {
  @IsOptional()
  @IsString()
  abstract?: string;

  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
