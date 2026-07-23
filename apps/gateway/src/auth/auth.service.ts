import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './jwt-payload.interface';

export const USERS_REPOSITORY = 'UsersRepository';

// NOTE: Replace UsersRepository stub with real Postgres queries (pg/Prisma).
// Kept as an interface here so this scaffold has no hidden DB dependency.
export interface UsersRepository {
  findByEmail(email: string): Promise<{
    id: string;
    email: string;
    passwordHash: string;
    hospitalId: string | null;
    roles: string[];
  } | null>;
  storeRefreshTokenHash(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  revokeRefreshToken?(tokenHash: string): Promise<void>;
  revokeAllRefreshTokens?(userId: string): Promise<void>;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @Inject(USERS_REPOSITORY) private usersRepository: UsersRepository,
  ) {}

  async validateCredentials(email: string, password: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async issueTokens(user: {
    id: string;
    email: string;
    hospitalId: string | null;
    roles: string[];
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      hospitalId: user.hospitalId,
      roles: user.roles as any,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m', // short-lived on purpose — refresh handles longevity
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.storeRefreshTokenHash(
      user.id,
      refreshHash,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return { accessToken, refreshToken };
  }

  /**
   * Rotates a refresh token: verifies the incoming token's signature, then
   * issues a brand new access+refresh pair. The old refresh token should be
   * revoked by the caller (JTI/hash lookup) so a leaked token only works once.
   */
  async refresh(oldRefreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersRepository.findByEmail(payload.email);
    if (!user) throw new UnauthorizedException('User no longer exists');

    // Production TODO: look up the stored hash for this token specifically
    // (not just by user) and confirm it isn't already revoked before rotating —
    // this catches refresh-token replay/theft.

    return this.issueTokens({
      id: user.id,
      email: user.email,
      hospitalId: user.hospitalId,
      roles: user.roles,
    });
  }

  async logout(userId: string) {
    await this.usersRepository.revokeAllRefreshTokens?.(userId);
  }
}
