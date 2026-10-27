import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Receptionist } from './entities/mechanichs.entity.js';
import { ReceptionistsService } from './mechanichs.service.js';

/** Repository double: only the methods used by the service are declared. */
const repository = {
  find: jest.fn<() => Promise<unknown>>(),
  findOneBy: jest.fn<(criteria: Record<string, unknown>) => Promise<unknown>>(),
};

describe('ReceptionistsService', () => {
  let service: ReceptionistsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceptionistsService,
        { provide: getRepositoryToken(Receptionist), useValue: repository },
      ],
    }).compile();

    service = module.get<ReceptionistsService>(ReceptionistsService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('lists the receptionists ordered by id', async () => {
    const rows = [
      { id: 1, name: 'Maria Rojas', active: true },
      { id: 2, name: 'Luis Mejia', active: true },
    ];
    repository.find.mockResolvedValueOnce(rows);

    await expect(service.findAll()).resolves.toEqual(rows);
    expect(repository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
  });

  it('looks a receptionist up by id (used before registering a reservation)', async () => {
    repository.findOneBy.mockResolvedValueOnce({ id: 1, active: true });

    await expect(service.find(1)).resolves.toMatchObject({ id: 1 });
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
  });

  it('answers null when the receptionist does not exist, so the caller answers 400', async () => {
    repository.findOneBy.mockResolvedValueOnce(null);

    await expect(service.find(999)).resolves.toBeNull();
  });
});
