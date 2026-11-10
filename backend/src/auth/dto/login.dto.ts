import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin1" })
  @IsString()
  username!: string;

  @IsString()
  @ApiProperty({ example: "admin123", minLength: 6, format: "password" })
  @MinLength(6)
  password!: string;
}
