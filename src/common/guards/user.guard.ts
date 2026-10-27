// src/common/guards/user.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service.js';
import { User } from '../../modules/users/entities/user.entity.js'; // <- Ruta relativa corregida

@Injectable()
export class UserGuard implements CanActivate { // <- Nombre de clase corregido para app.module.ts
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const xUser = request.headers['x-user'];

    if (!xUser) {
      return false;
    }

    const user: User | undefined = await this.usersService.findById(xUser); 

    if (!user) {
      return false;
    }

    request.user = user; 
    return true;
  }
}
