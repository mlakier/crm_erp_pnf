import { IsArray, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleCodes?: string[];

  @IsOptional()
  @IsString()
  @MinLength(3)
  status?: "ACTIVE" | "INACTIVE";
}
