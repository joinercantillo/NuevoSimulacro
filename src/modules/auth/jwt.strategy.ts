import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser, JwtPayload } from './jwt-payload.interface.js';

/**
 * Validates the `Authorization: Bearer <token>` header.
 *
 * The secret is not defined in the code: it comes from JWT_SECRET in .env,
 * injected through ConfigService.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwtSecret'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub || !payload.username) {
      throw new UnauthorizedException('The access token is not valid');
    }

    return {
      id: payload.sub,
      username: payload.username,
      name: payload.name,
      role: payload.role,
    };
  }
}
