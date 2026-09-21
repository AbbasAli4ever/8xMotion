import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { CreditsService } from './credits.service';
@UseGuards(JwtGuard) @Controller('credits')
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}
  @Get('balance') balance(@CurrentUser() user: AuthUser) { return this.credits.balance(user.id); }
  @Get('ledger') ledger(@CurrentUser() user: AuthUser, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number) { return this.credits.ledger(user.id, page, Math.min(limit, 100)); }
}
