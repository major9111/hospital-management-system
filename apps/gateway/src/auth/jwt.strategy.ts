import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    // Runs on every request — keep this fast, no DB calls here.
    // Fresh role/permission changes are picked up on next login/refresh.
    return {
      userId: payload.sub,
      email: payload.email,
      hospitalId: payload.hospitalId,
      roles: payload.roles,
    };
  }
}
