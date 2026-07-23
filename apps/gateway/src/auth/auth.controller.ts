import { Body, Controller, Post, HttpCode, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

class LoginDto {
  email: string;
  password: string;
}

class RefreshDto {
  refreshToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // brute-force protection: 5 tries/min/IP
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateCredentials(
      dto.email,
      dto.password,
    );
    const tokens = await this.authService.issueTokens({
      id: user.id,
      email: user.email,
      hospitalId: user.hospitalId,
      roles: user.roles,
    });
    return tokens;
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req: any) {
    await this.authService.logout(req.user.userId);
    return { message: 'Logged out' };
  }
}
