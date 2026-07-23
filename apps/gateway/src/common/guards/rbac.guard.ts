import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_KEY,
} from '../decorators/require-permission.decorator';
import { DEFAULT_ROLE_PERMISSIONS, Permission, Role } from '../../rbac/roles.enum';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<Permission>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    if (!required) return true; // no permission declared -> public within auth

    const request = context.switchToHttp().getRequest();
    const user = request.user; // populated by JwtAuthGuard upstream
    if (!user) throw new ForbiddenException('Not authenticated');

    const userRoles: Role[] = user.roles ?? [];
    const scopeRank = { own: 0, department: 1, hospital: 2, all: 3 };

    const hasPermission = userRoles.some((role) => {
      const perms = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
      return perms.some(
        (p) =>
          p.resource === required.resource &&
          p.action === required.action &&
          scopeRank[p.scope] >= scopeRank[required.scope],
      );
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing permission: ${required.action} ${required.resource} (${required.scope})`,
      );
    }

    // Attach the resolved scope so controllers can filter queries accordingly
    request.resolvedScope = required.scope;
    return true;
  }
}
