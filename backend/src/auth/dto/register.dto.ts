import { IsString, Matches, MinLength } from "class-validator";

const FACULTY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class RegisterDto {
  @IsString()
  @MinLength(2)
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;

  @IsString()
  @Matches(FACULTY_UUID, { message: "facultyId must be a UUID" })
  facultyId!: string;
}
