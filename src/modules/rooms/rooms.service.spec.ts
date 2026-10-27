import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Room } from './entities/room.entity.js';
import { RoomsService } from './rooms.service.js';

/** Repository double: only the methods used by the service are declared. */
const repository = {
  find: jest.fn<() => Promise<unknown>>(),
  findOneBy: jest.fn<(criteria: Record<string, unknown>) => Promise<unknown>>(),
};

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsService, { provide: getRepositoryToken(Room), useValue: repository }],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('lists the rooms with their branch and ordered by id', async () => {
    const rows = [
      { id: 1, number: '101', roomType: 'SINGLE', hotel: { id: 1 } },
      { id: 2, number: '102', roomType: 'DOUBLE', hotel: { id: 1 } },
    ];
    repository.find.mockResolvedValueOnce(rows);

    await expect(service.findAll()).resolves.toEqual(rows);

    expect(repository.find).toHaveBeenCalledWith({
      relations: { hotel: true },
      order: { id: 'ASC' },
    });
  });

  it('looks a room up by id before registering a reservation', async () => {
    repository.findOneBy.mockResolvedValueOnce({ id: 3, status: 'AVAILABLE' });

    await expect(service.find(3)).resolves.toMatchObject({ id: 3 });
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 3 });
  });

  it('answers null when the room does not exist, so the caller answers 400', async () => {
    repository.findOneBy.mockResolvedValueOnce(null);

    await expect(service.find(999)).resolves.toBeNull();
  });
});
