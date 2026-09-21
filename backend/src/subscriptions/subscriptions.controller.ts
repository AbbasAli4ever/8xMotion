import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { SubscribeDto, TopUpDto } from './subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}
  @Get('plans') plans() { return this.subscriptions.plans(); }
  @Get('credit-packs') packs() { return this.subscriptions.packs(); }
  @UseGuards(JwtGuard) @Get('subscriptions/me') mine(@CurrentUser() user: AuthUser) { return this.subscriptions.mine(user.id); }
  @UseGuards(JwtGuard) @Post('mock-checkout/subscriptions') subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) { return this.subscriptions.subscribe(user.id, dto.planSlug, dto.interval); }
  @UseGuards(JwtGuard) @Post('mock-checkout/top-ups') topUp(@CurrentUser() user: AuthUser, @Body() dto: TopUpDto) { return this.subscriptions.topUp(user.id, dto.packSlug); }
  @UseGuards(JwtGuard) @Post('subscriptions/cancel') cancel(@CurrentUser() user: AuthUser) { return this.subscriptions.cancel(user.id); }
}
