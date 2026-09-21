import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './users.dto';

@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('me') async me(@CurrentUser() auth: AuthUser) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.id }, select: { id: true, email: true, firstName: true, lastName: true, emailVerifiedAt: true, role: true, createdAt: true } });
    return user;
  }
  @Patch('me') update(@CurrentUser() auth: AuthUser, @Body() dto: UpdateUserDto) { return this.prisma.user.update({ where: { id: auth.id }, data: dto, select: { id: true, email: true, firstName: true, lastName: true } }); }
}
