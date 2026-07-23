import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../rbac/roles.enum';

export const PERMISSION_KEY = 'required_permission';

/**
 * Attach to a controller method to declare what permission is needed.
 * Example:
 *   @RequirePermission({ resource: 'patient_record', action: 'read', scope: 'department' })
 */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);
