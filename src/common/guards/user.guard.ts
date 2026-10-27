// src/common/guards/user.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { UsersService } from '../../modules/users/users.service.js';
import { User } from '../../modules/users/entities/user.entity.js';

@Injectable()
export class UserGuard implements CanActivate {
  // Asegúrate de inyectar el Reflector y tu UsersService en el constructor
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Validar si el endpoint o controlador tiene el decorador @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Si es público, se salta la validación
    }

    // 2. Lógica para rutas protegidas
    const request = context.switchToHttp().getRequest();
    const xUser = request.headers['x-user'];

    if (!xUser) {
      return false; // No viene la cabecera, acceso denegado
    }

    const user: User | undefined = await this.usersService.findById(xUser); 

    if (!user) {
      return false; // El usuario no existe en PostgreSQL, acceso denegado
    }

    // Inyectamos el usuario en el objeto de la petición
    request.user = user; 
    
    // 3. ¡EL FIX AQUÍ!: Retornar true de forma explícita si pasó todas las condiciones
    return true; 
  }
}
