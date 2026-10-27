import { jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

const usersService = {
  findByUsernameWithPassword: jest.fn<(username: string) => Promise<unknown>>(),
};

const jwtService = {
  sign: jest.fn<() => string>(),
};

/** The lifetime is read from JWT_EXPIRES_IN in .env. */
const configService = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, unknown> = { jwtExpiresIn: '1h' };
    return values[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  const storedUser = async () => ({
    id: 1,
    username: 'admin-1',
    name: 'Ana Admin (chain administrator)',
    role: Role.ADMIN,
    receptionistId: null,
    passwordHash: await bcrypt.hash('Carnaval2026', 4),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('issues a token when the credentials are valid', async () => {
    usersService.findByUsernameWithPassword.mockResolvedValueOnce(await storedUser());
    jwtService.sign.mockReturnValueOnce('signed-token');

    const result = await service.login('admin-1', 'Carnaval2026');

    expect(result.access_token).toBe('signed-token');
    expect(result.token_type).toBe('Bearer');
    expect(result.expires_in).toBe('1h');
    expect(result.user).toMatchObject({ id: 1, username: 'admin-1', role: Role.ADMIN });
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 1, username: 'admin-1', role: Role.ADMIN }),
    );
  });

  it('answers 401 when the user does not exist', async () => {
    usersService.findByUsernameWithPassword.mockResolvedValueOnce(null);

    await expect(service.login('ghost-user', 'whatever')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('answers 401 with the same message for an unknown user and a wrong password', async () => {
    const unknownUserMessage = await service
      .login('ghost-user', 'whatever')
      .catch((error: Error) => error.message);

    usersService.findByUsernameWithPassword.mockResolvedValueOnce(await storedUser());
    const wrongPasswordMessage = await service
      .login('admin-1', 'wrong-password')
      .catch((error: Error) => error.message);

    expect(unknownUserMessage).toBe('Invalid credentials');
    expect(wrongPasswordMessage).toBe(unknownUserMessage);
  });
});
