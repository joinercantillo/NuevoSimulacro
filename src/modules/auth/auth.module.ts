// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js'; // 👈 Asegura esta ruta relativa (.js)
import { JwtStrategy } from './jwt.strategy.js';

@Module({
  imports: [
    UsersModule, // 👈 ¡ESTA IMPORTACIÓN CONECTA AMBOS MÓDULOS!
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'CLAVE_SECRETA_SUPER_SEGURA',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
