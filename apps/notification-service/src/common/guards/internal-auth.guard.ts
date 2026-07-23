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

// This service now runs as a PUBLIC Render web service (free tier doesn't
// support private services without a card on file), so this signature
// check is the ONLY thing stopping an arbitrary internet caller from
// hitting /notify/* — there's no network-level isolation backing it up
// the way there would be with Render private services or AWS security
// groups. Keep INTERNAL_SERVICE_SECRET as tightly held as any other secret
// in this system; it's doing more work here than it was before.
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
