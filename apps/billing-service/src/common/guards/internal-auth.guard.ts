import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface InternalContext {
  userId: string;
  hospitalId: string;
  roles: string[];
  scope: string;
}

// This service is only ever reached from the gateway (security group /
// network policy enforces that in infra/terraform), but it verifies the
// signature anyway rather than trusting the network boundary alone —
// same defense-in-depth pattern as ehr-service and ai-service's deps.py.
@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-internal-token'];
    if (!token) throw new UnauthorizedException('Missing internal token');

    try {
      const claims = this.jwtService.verify<InternalContext>(token, {
        secret: process.env.INTERNAL_SERVICE_SECRET,
      });
      request.internalContext = claims;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid internal token');
    }
  }
}
