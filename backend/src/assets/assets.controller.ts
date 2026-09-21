import { Controller, DefaultValuePipe, Delete, Get, Param, ParseEnumPipe, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@UseGuards(JwtGuard) @Controller('assets')
export class AssetsController {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}
  @Get() async list(@CurrentUser() user: AuthUser, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number, @Query('mediaType', new ParseEnumPipe(MediaType, { optional: true })) mediaType?: MediaType) {
    const take = Math.min(limit, 100); const where = { userId: user.id, deletedAt: null, ...(mediaType ? { mediaType } : {}) };
    const [items, total] = await this.prisma.$transaction([this.prisma.asset.findMany({ where, include: { generation: { select: { prompt: true, createdAt: true, requestSnapshot: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take }), this.prisma.asset.count({ where })]);
    return { items: await Promise.all(items.map(async (asset) => ({ ...asset, previewUrl: await this.storage.signedUrl(asset.objectKey) }))), page, limit: take, total };
  }
  @Get(':id') async one(@CurrentUser() user: AuthUser, @Param('id') id: string) { const asset = await this.prisma.asset.findFirstOrThrow({ where: { id, userId: user.id, deletedAt: null }, include: { generation: true } }); return { ...asset, previewUrl: await this.storage.signedUrl(asset.objectKey) }; }
  @Get(':id/download') async download(@CurrentUser() user: AuthUser, @Param('id') id: string) { const asset = await this.prisma.asset.findFirstOrThrow({ where: { id, userId: user.id, deletedAt: null } }); return { url: await this.storage.signedUrl(asset.objectKey, `8xmotion-${asset.id}.${asset.contentType.split('/')[1]}`), expiresIn: 900 }; }
  @Delete(':id') async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { await this.prisma.asset.findFirstOrThrow({ where: { id, userId: user.id, deletedAt: null } }); return this.prisma.asset.update({ where: { id }, data: { deletedAt: new Date() } }); }
}
