import { Body, Controller, DefaultValuePipe, Get, Param, ParseEnumPipe, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { GenerationStatus, MediaType } from '@prisma/client';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { CreateGenerationDto, QuoteGenerationDto, RetryGenerationDto } from './generation.dto';
import { GenerationsService } from './generations.service';
@Controller()
export class GenerationsController {
  constructor(private readonly generations: GenerationsService) {}
  @Get('generation-capabilities') capabilities() { return this.generations.capabilities(); }
  @UseGuards(JwtGuard) @Post('generations/quote') quote(@Body() dto: QuoteGenerationDto) { return this.generations.quote(dto); }
  @UseGuards(JwtGuard) @Post('generations/images') image(@CurrentUser() user: AuthUser, @Body() dto: CreateGenerationDto) { dto.mediaType = MediaType.IMAGE; return this.generations.create(user.id, dto); }
  @UseGuards(JwtGuard) @Post('generations/videos') video(@CurrentUser() user: AuthUser, @Body() dto: CreateGenerationDto) { dto.mediaType = MediaType.VIDEO; return this.generations.create(user.id, dto); }
  @UseGuards(JwtGuard) @Get('generations/:id') one(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.generations.one(user.id, id); }
  @UseGuards(JwtGuard) @Get('generations') list(@CurrentUser() user: AuthUser, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number, @Query('mediaType', new ParseEnumPipe(MediaType, { optional: true })) mediaType?: MediaType, @Query('status', new ParseEnumPipe(GenerationStatus, { optional: true })) status?: GenerationStatus) { return this.generations.list(user.id, page, Math.min(limit, 100), mediaType, status); }
  @UseGuards(JwtGuard) @Post('generations/:id/cancel') cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.generations.cancel(user.id, id); }
  @UseGuards(JwtGuard) @Post('generations/:id/retry') retry(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RetryGenerationDto) { return this.generations.retry(user.id, id, dto.idempotencyKey); }
}
