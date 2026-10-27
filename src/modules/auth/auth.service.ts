import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum.js';
import { UsersService } from '../users/users.service.js';
import { JwtPayload } from './jwt-payload.interface.js';

export interface LoginResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: string;
  user: {
    id: number;
    username: string;
    name: string;
    role: Role;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Verifies the credentials against the bcrypt hash stored in PostgreSQL and
   * issues a JWT. The same message is returned when the user does not exist
   * and when the password is wrong, so accounts cannot be enumerated.
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    const user = await this.usersService.findByUsernameWithPassword(username);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      token_type: 'Bearer',
      expires_in: this.configService.getOrThrow<string>('jwtExpiresIn'),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    };
  }
}
