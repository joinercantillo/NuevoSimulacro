// src/modules/users/users.controller.ts
import { Controller, Get, Post, Body, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service.js';
// ¡AGREGA ESTA LÍNEA DE IMPORTACIÓN!
import { CreateUserDto } from './dto/create-user.dto.js'; 
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Users')
@ApiSecurity('api-key-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  create(@Body() createUserDto: CreateUserDto) { // <- Aquí ya no fallará
    return this.usersService.create(createUserDto);
  }

  // ... el resto de tus métodos del controlador
}
