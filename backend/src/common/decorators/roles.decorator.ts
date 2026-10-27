import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/common/enums';

export const ROLES_KEY = 'roles';

/** Restricts a route (or a whole controller) to the given roles. Enforced by RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
