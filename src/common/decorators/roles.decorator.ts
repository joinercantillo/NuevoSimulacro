import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Declares the roles allowed to run an endpoint.
 *
 * @example
 * @Roles(Role.ADMIN, Role.COORDINATOR)
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
