import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../common/enums/role.enum.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './jwt-payload.interface.js';

const authService = {
  login: jest.fn<() => Promise<unknown>>(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('sends the credentials to the service', async () => {
    authService.login.mockResolvedValueOnce({ access_token: 'token' });

    const result = await controller.login({
      username: 'admin-1',
      password: 'Carnaval2026',
    } as never);

    expect(authService.login).toHaveBeenCalledWith('admin-1', 'Carnaval2026');
    expect(result).toEqual({ access_token: 'token' });
  });

  it('returns the identity placed in the request by the JWT strategy', () => {
    const user: AuthenticatedUser = {
      id: 1,
      username: 'admin-1',
      name: 'Ana Admin (chain administrator)',
      role: Role.ADMIN,
    };

    expect(controller.getProfile(user)).toEqual(user);
  });
});
