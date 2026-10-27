import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

const usersService = {
  create: jest.fn<() => Promise<unknown>>(),
  findAll: jest.fn<() => Promise<unknown>>(),
  findOne: jest.fn<() => Promise<unknown>>(),
  update: jest.fn<() => Promise<unknown>>(),
  remove: jest.fn<() => Promise<unknown>>(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates the creation to the service', async () => {
    const dto = {
      username: 'receptionist-3',
      name: 'New Receptionist',
      role: 'receptionist',
      receptionistId: 1,
      password: 'secret-123',
    };
    usersService.create.mockResolvedValueOnce({ id: 5, username: 'receptionist-3' });

    const result = await controller.create(dto as never);

    expect(usersService.create).toHaveBeenCalledWith(dto);
    expect(result).toMatchObject({ id: 5 });
  });

  it('delegates the lookup of a user', async () => {
    usersService.findOne.mockResolvedValueOnce({ id: 1, username: 'admin-1' });

    await controller.findOne(1);

    expect(usersService.findOne).toHaveBeenCalledWith(1);
  });

  it('delegates the deletion to the service', async () => {
    usersService.remove.mockResolvedValueOnce({ id: 2, username: 'coordinator-1' });

    await controller.remove(2);

    expect(usersService.remove).toHaveBeenCalledWith(2);
  });
});
