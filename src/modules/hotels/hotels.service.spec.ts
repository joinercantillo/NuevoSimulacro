import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Hotel } from './entities/hotel.entity.js';
import { HotelsService } from './hotels.service.js';

/** Repository double: the service only asks for `find`. */
const repository = {
  find: jest.fn<() => Promise<unknown>>(),
};

describe('HotelsService', () => {
  let service: HotelsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [HotelsService, { provide: getRepositoryToken(Hotel), useValue: repository }],
    }).compile();

    service = module.get<HotelsService>(HotelsService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('lists the branches of the chain ordered by id', async () => {
    const branches = [
      { id: 1, name: 'Arenosa Via 40' },
      { id: 2, name: 'Arenosa Malecon' },
      { id: 3, name: 'Arenosa Norte' },
    ];
    repository.find.mockResolvedValueOnce(branches);

    await expect(service.findAll()).resolves.toEqual(branches);

    expect(repository.find).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
  });

  it('answers with an empty list when the table has no rows yet', async () => {
    repository.find.mockResolvedValueOnce([]);

    await expect(service.findAll()).resolves.toEqual([]);
  });
});
