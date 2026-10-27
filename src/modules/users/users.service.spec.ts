import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../../common/enums/role.enum.js';
import { ReceptionistsService } from '../mechanics/mechanichs.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

/** Repository double: only the methods used by the service are declared. */
const repository = {
  findOneBy: jest.fn<(criteria: Record<string, unknown>) => Promise<unknown>>(),
  findOne: jest.fn<(criteria: unknown) => Promise<unknown>>(),
  find: jest.fn<() => Promise<unknown>>(),
  create: jest.fn<(data: Record<string, unknown>) => Record<string, unknown>>(),
  save: jest.fn<(entity: Record<string, unknown>) => Promise<unknown>>(),
  remove: jest.fn<(entity: Record<string, unknown>) => Promise<unknown>>(),
};

const receptionistsService = {
  find: jest.fn<(id: number) => Promise<unknown>>(),
};

/** bcryptRounds is read from .env: a low value keeps the test fast. */
const configService = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, unknown> = {
      bcryptRounds: 4,
      seedUserPassword: 'seed-secret',
    };
    return values[key];
  }),
};

describe('UsersService', () => {
  let service: UsersService;

  const receptionistDto: CreateUserDto = {
    username: 'receptionist-3',
    name: 'New Receptionist',
    role: Role.RECEPTIONIST,
    receptionistId: 1,
    password: 'secret-123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: ReceptionistsService, useValue: receptionistsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('hashes the password and never returns it', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);
      receptionistsService.find.mockResolvedValueOnce({ id: 1, active: true });
      repository.create.mockImplementationOnce((data) => ({ id: 5, ...data }));
      repository.save.mockImplementationOnce(async (entity) => entity);

      const created = await service.create(receptionistDto);
      const stored = repository.create.mock.calls[0][0] as Record<string, string>;

      expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(stored.passwordHash).not.toBe(receptionistDto.password);
      expect(created).not.toHaveProperty('passwordHash');
      expect(created).toMatchObject({ username: 'receptionist-3', role: Role.RECEPTIONIST });
    });

    it('rejects a username that is already registered', async () => {
      repository.findOneBy.mockResolvedValueOnce({ id: 1 });

      await expect(service.create(receptionistDto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires receptionistId when the role is receptionist', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...receptionistDto, receptionistId: undefined }),
      ).rejects.toThrow('receptionistId is required');
    });

    it('rejects receptionistId for roles that do not use it', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);

      await expect(
        service.create({
          ...receptionistDto,
          username: 'admin-2',
          role: Role.ADMIN,
        }),
      ).rejects.toThrow('only valid when the role is');
    });

    it('rejects a link to a receptionist that does not exist', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);
      receptionistsService.find.mockResolvedValueOnce(null);

      await expect(service.create(receptionistDto)).rejects.toThrow('does not exist');
    });

    it('rejects a link to a receptionist that is no longer active', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);
      receptionistsService.find.mockResolvedValueOnce({ id: 1, active: false });

      await expect(service.create(receptionistDto)).rejects.toThrow('is not active');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('creates a user without link when the role does not need one', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);
      repository.create.mockImplementationOnce((data) => ({ id: 6, ...data }));
      repository.save.mockImplementationOnce(async (entity) => entity);

      const created = await service.create({
        username: 'coordinator-2',
        name: 'Second Coordinator',
        role: Role.COORDINATOR,
        password: 'secret-123',
      });

      expect(receptionistsService.find).not.toHaveBeenCalled();
      expect(created).toMatchObject({ id: 6, role: Role.COORDINATOR });

      const stored = repository.create.mock.calls[0][0] as Record<string, unknown>;
      expect(stored.receptionistId).toBeNull();
      expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('read the users (admin only)', () => {
    it('lists them ordered by id and never with the hash', async () => {
      repository.find.mockResolvedValueOnce([
        { id: 1, username: 'admin-1', name: 'Ana Admin', passwordHash: 'first' },
        { id: 4, username: 'receptionist-2', name: 'Luis Mejia', passwordHash: 'second' },
      ]);

      const users = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
      expect(users).toHaveLength(2);
      expect(users.map((user) => user.username)).toEqual(['admin-1', 'receptionist-2']);
      users.forEach((user) => expect(user).not.toHaveProperty('passwordHash'));
    });

    it('returns one user without the hash', async () => {
      repository.findOneBy.mockResolvedValueOnce({
        id: 2,
        username: 'coordinator-1',
        role: Role.COORDINATOR,
        passwordHash: 'hidden',
      });

      const user = await service.findOne(2);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 2 });
      expect(user).toMatchObject({ id: 2, username: 'coordinator-1' });
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('answers 404 when the id does not exist', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.findOne(999)).rejects.toThrow('does not exist');
    });
  });

  describe('remove', () => {
    it('deletes the user without exposing the hash', async () => {
      repository.findOneBy.mockResolvedValueOnce({
        id: 5,
        username: 'temporary-user',
        passwordHash: 'hidden',
      });
      repository.remove.mockResolvedValueOnce({ id: 5, username: 'temporary-user' });

      const removed = await service.remove(5);

      expect(repository.remove).toHaveBeenCalledTimes(1);
      expect(removed).toMatchObject({ id: 5 });
      expect(removed).not.toHaveProperty('passwordHash');
    });

    it('answers 404 when the user does not exist', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.remove(999)).rejects.toThrow('does not exist');
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });

  describe('lookup used by the guards and the reservations', () => {
    it('returns undefined when the username does not exist', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.findByUsername('ghost-user')).resolves.toBeUndefined();
    });

    it('finds the receptionist linked to the row of the receptionists table', async () => {
      repository.findOneBy.mockResolvedValueOnce({ id: 3, role: Role.RECEPTIONIST });

      const user = await service.findReceptionistByReceptionistId(2);

      expect(repository.findOneBy).toHaveBeenCalledWith({
        receptionistId: 2,
        role: Role.RECEPTIONIST,
      });
      expect(user).toMatchObject({ id: 3 });
    });

    it('answers undefined when no receptionist user is linked to that row', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.findReceptionistByReceptionistId(9)).resolves.toBeUndefined();
    });

    it('does not query the database when the header is empty', async () => {
      await expect(service.findByUsername(undefined)).resolves.toBeUndefined();
      expect(repository.findOneBy).not.toHaveBeenCalled();
    });

    it('selects the hash only for the login (password_hash has select: false)', async () => {
      repository.findOne.mockResolvedValueOnce({
        id: 1,
        username: 'admin-1',
        role: Role.ADMIN,
        passwordHash: '$2b$4$hash',
      });

      const user = await service.findByUsernameWithPassword('admin-1');

      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { username: 'admin-1' },
          select: expect.objectContaining({
            passwordHash: true,
            role: true,
            receptionistId: true,
          }),
        }),
      );
      expect(user).toMatchObject({ username: 'admin-1' });
    });

    it('answers null when the login uses an unknown username', async () => {
      repository.findOne.mockResolvedValueOnce(null);

      await expect(service.findByUsernameWithPassword('ghost-user')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('clears the link when the role stops being receptionist', async () => {
      repository.findOneBy.mockResolvedValueOnce({
        id: 3,
        username: 'receptionist-1',
        name: 'Maria Rojas',
        role: Role.RECEPTIONIST,
        receptionistId: 1,
      });
      repository.save.mockImplementationOnce(async (entity) => entity);

      const update: UpdateUserDto = { role: Role.COORDINATOR };
      const updated = await service.update(3, update);

      expect(updated.receptionistId).toBeNull();
      expect(updated.role).toBe(Role.COORDINATOR);
    });

    it('answers 404 when the user does not exist', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.update(999, {})).rejects.toThrow('does not exist');
    });

    it('replaces the hash when the update sends a new password', async () => {
      repository.findOneBy.mockResolvedValueOnce({
        id: 2,
        username: 'coordinator-1',
        name: 'Carlos Coordinator',
        role: Role.COORDINATOR,
        receptionistId: null,
        passwordHash: 'old-hash',
      });
      repository.save.mockImplementationOnce(async (entity) => entity);

      const updated = await service.update(2, { password: 'brand-new-secret' });
      const saved = repository.save.mock.calls[0][0] as Record<string, string>;

      expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(saved.passwordHash).not.toBe('brand-new-secret');
      expect(updated).not.toHaveProperty('passwordHash');
    });

    it('keeps the previous hash when the update does not send a password', async () => {
      repository.findOneBy.mockResolvedValueOnce({
        id: 2,
        username: 'coordinator-1',
        name: 'Carlos Coordinator',
        role: Role.COORDINATOR,
        receptionistId: null,
        passwordHash: 'old-hash',
      });
      repository.save.mockImplementationOnce(async (entity) => entity);

      const updated = await service.update(2, { name: 'New Name' });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name', passwordHash: 'old-hash' }),
      );
      expect(updated).toMatchObject({ name: 'New Name' });
      expect(updated).not.toHaveProperty('passwordHash');
    });

    it('keeps the link of a receptionist user when only the name changes', async () => {
      repository.findOneBy.mockResolvedValueOnce({
        id: 3,
        username: 'receptionist-1',
        name: 'Maria Rojas',
        role: Role.RECEPTIONIST,
        receptionistId: 1,
      });
      receptionistsService.find.mockResolvedValueOnce({ id: 1, active: true });
      repository.save.mockImplementationOnce(async (entity) => entity);

      const updated = await service.update(3, { name: 'Maria G. Rojas' });

      expect(receptionistsService.find).toHaveBeenCalledWith(1);
      expect(updated).toMatchObject({
        name: 'Maria G. Rojas',
        role: Role.RECEPTIONIST,
        receptionistId: 1,
      });
    });

    it('rejects an update that links a user to an inactive receptionist', async () => {
      repository.findOneBy.mockResolvedValueOnce({
        id: 6,
        username: 'new-user',
        name: 'New User',
        role: Role.RECEPTIONIST,
        receptionistId: null,
      });
      receptionistsService.find.mockResolvedValueOnce({ id: 2, active: false });

      await expect(
        service.update(6, { role: Role.RECEPTIONIST, receptionistId: 2 }),
      ).rejects.toThrow('is not active');
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
