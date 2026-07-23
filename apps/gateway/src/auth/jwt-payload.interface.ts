import { Role } from '../rbac/roles.enum';

export interface JwtPayload {
  sub: string;        // user id
  email: string;
  hospitalId: string | null;
  roles: Role[];
}
