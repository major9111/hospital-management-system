import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface InternalClaims {
  userId: string;
  hospitalId: string;
  roles: string[];
  scope: string; // 'own' | 'department' | 'hospital' | 'all' — resolved by RbacGuard for this request
}

@Injectable()
export class InternalTokenService {
  constructor(private jwtService: JwtService) {}

  /**
   * Downstream services (ehr-service, ai-service) verify this token instead
   * of trusting plain headers — closes the gap where anything on the
   * private network could otherwise spoof `x-user-id` etc.
   */
  sign(claims: InternalClaims): string {
    return this.jwtService.sign(claims, {
      secret: process.env.INTERNAL_SERVICE_SECRET,
      expiresIn: '30s', // only needs to survive one hop, keep it short
    });
  }
}
