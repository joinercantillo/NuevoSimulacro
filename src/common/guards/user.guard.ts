import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { USER_DIRECTORY } from '../../modules/users/user-directory.interface.js';
import type { User } from '../../modules/users/entities/user.entity.js';
import type { UserDirectory } from '../../modules/users/user-directory.interface.js';

/**
 * Identifies the caller through the x-user header, looking the value up in the
 * users table (PostgreSQL). The role always comes from the server: a role sent
 * by the client is never trusted (RN-04).
 *
 * Endpoints marked with @Public() skip this guard: they only need the API key
 * (for example POST /auth/login, where the token is obtained).
 */
@Injectable()
export class UserGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(USER_DIRECTORY) private readonly userDirectory: UserDirectory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const xUser: string | undefined = request.headers['x-user'];

    if (!xUser) {
      throw new UnauthorizedException('The x-user header is missing');
    }

    const user: User | undefined = await this.userDirectory.findByUsername(xUser);

    if (!user) {
      throw new UnauthorizedException(`User "${xUser}" does not exist`);
    }

    request.user = user;
    return true;
  }
}
