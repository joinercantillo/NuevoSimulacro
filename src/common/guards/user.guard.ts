import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service.js';
import { User } from '../../modules/users/entities/user.entity.js';


/**
 * Identifies the caller through the x-user header.
 * The role always comes from the server: a role sent by the client is never trusted.
 */
@Injectable()
export class UserGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const xUser: string | undefined = request.headers['x-user'];

    if (!xUser) {
      throw new UnauthorizedException('The x-user header is missing');
    }

   const user: User | undefined = await this.usersService.findById(xUser); // <- Agregado 'await'
    if (!user) {
      throw new UnauthorizedException(`User "${xUser}" does not exist`);
    }

    request.user = user;
    return true;
  }
}
