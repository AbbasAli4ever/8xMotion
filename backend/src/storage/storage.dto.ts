import { IsInt, IsString, Max, Min } from 'class-validator';
export class PresignUploadDto {
  @IsString() filename!: string;
  @IsString() contentType!: string;
  @IsInt() @Min(1) @Max(100_000_000) size!: number;
}
export class CompleteUploadDto { @IsString() uploadId!: string; }
