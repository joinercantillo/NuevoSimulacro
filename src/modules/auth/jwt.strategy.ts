// src/modules/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'MI_CLAVE_SECRETA_SUPER_SECRETA_CARNAVAL_2026',
    });
  }

  async validate(payload: any) {
    // Lo que retornes aquí se inyectará automáticamente en req.user
    if (!payload) {
      throw new UnauthorizedException('Token payload is empty');
    }
    return { 
      id: payload.sub, 
      username: payload.username, 
      name: payload.name, 
      role: payload.role 
    };
  }
}
