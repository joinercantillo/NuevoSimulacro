import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { User } from '../../modules/users/user.js';

/**
 * Applies the roles declared with @Roles(...) on the endpoint.
 * Endpoints without the decorator accept any identified user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User | undefined = request.user;

    if (!user) {
      throw new UnauthorizedException('User not identified');
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Role "${user.role}" cannot access this resource. Allowed roles: ${allowedRoles.join(', ')}`,
      );
    }

    return true;
  }
}
