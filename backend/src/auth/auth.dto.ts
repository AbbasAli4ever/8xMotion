import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsString() @Length(2, 60) firstName!: string;
  @IsString() @Length(2, 60) lastName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @MaxLength(128) @Matches(/[A-Za-z]/) @Matches(/[0-9]/) password!: string;
  @IsString() confirmPassword!: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

export class EmailCodeDto {
  @IsEmail() email!: string;
  @IsString() @Length(6, 6) code!: string;
}

export class EmailDto { @IsEmail() email!: string; }

export class ResetPasswordDto extends EmailCodeDto {
  @IsString() @MinLength(8) @MaxLength(128) @Matches(/[A-Za-z]/) @Matches(/[0-9]/) password!: string;
  @IsString() confirmPassword!: string;
}

export class ChangePasswordDto {
  @IsString() @IsOptional() currentPassword?: string;
  @IsString() @MinLength(8) @MaxLength(128) @Matches(/[A-Za-z]/) @Matches(/[0-9]/) newPassword!: string;
  @IsString() confirmPassword!: string;
}
