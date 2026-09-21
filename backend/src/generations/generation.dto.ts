import { MediaType } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class QuoteGenerationDto {
  @IsEnum(MediaType) mediaType!: MediaType;
  @IsString() model!: string;
  @IsOptional() @IsInt() @IsIn([4, 6, 8]) duration?: number;
  @IsString() aspectRatio!: string;
  @IsString() resolution!: string;
  @IsOptional() @IsInt() @Min(1) @Max(4) count?: number;
  @IsOptional() @IsString() quality?: string;
  @IsOptional() @IsString() uploadId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) uploadIds?: string[];
}
export class CreateGenerationDto extends QuoteGenerationDto {
  @IsString() @Length(1, 2000) prompt!: string;
  @IsString() @Length(8, 100) idempotencyKey!: string;
}
export class RetryGenerationDto { @IsString() @Length(8, 100) idempotencyKey!: string; }
