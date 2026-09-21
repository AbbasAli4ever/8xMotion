import { IsOptional, IsString, Length } from 'class-validator';
export class UpdateUserDto {
  @IsOptional() @IsString() @Length(2, 60) firstName?: string;
  @IsOptional() @IsString() @Length(2, 60) lastName?: string;
}
