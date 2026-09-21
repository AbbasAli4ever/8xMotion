import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { CompleteUploadDto, PresignUploadDto } from './storage.dto';
import { StorageService } from './storage.service';
@UseGuards(JwtGuard) @Controller('uploads')
export class StorageController {
  constructor(private readonly storage: StorageService) {}
  @Post('presign') presign(@CurrentUser() user: AuthUser, @Body() dto: PresignUploadDto) { return this.storage.presign(user.id, dto); }
  @Post('complete') complete(@CurrentUser() user: AuthUser, @Body() dto: CompleteUploadDto) { return this.storage.complete(user.id, dto.uploadId); }
}
