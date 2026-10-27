import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../../common/enums/role.enum.js';
import { ReceptionistsService } from '../mechanics/mechanichs.service.js';
import { RoomsService } from '../cars/cars.service.js';
import { RoomType } from '../cars/enums/car-type.enum.js';
import { USER_DIRECTORY } from '../users/user-directory.interface.js';
import type { UserDirectory } from '../users/user-directory.interface.js';
import { User } from '../users/entities/user.entity.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { Reservation } from './entities/maintenances.entity.js';
import { ReservationStatus } from './enums/maintenance-status.enum.js';
import { ReservationsService } from './maintenances.service.js';

/** Repository double: only the methods used by the service are declared. */
const repository = {
  find: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  findOneBy: jest.fn<(criteria: Record<string, unknown>) => Promise<unknown>>(),
  create: jest.fn<(data: Record<string, unknown>) => Record<string, unknown>>(),
  save: jest.fn<(entity: Record<string, unknown>) => Promise<unknown>>(),
  count: jest.fn<(options: { where: { status: ReservationStatus } }) => Promise<number>>(),
};

/** Lookups behind the contract: the mocks keep their Jest API visible. */
const findByUsername = jest.fn<(username: string | undefined) => Promise<User | undefined>>();
const findReceptionistByReceptionistId = jest.fn<(id: number) => Promise<User | undefined>>();

/**
 * Contract injected through the USER_DIRECTORY token (Dependency Inversion):
 * the double must satisfy it exactly, so the service keeps working with any
 * other implementation of the interface.
 */
const userDirectory: UserDirectory = { findByUsername, findReceptionistByReceptionistId };

const receptionistsService = {
  find: jest.fn<(id: number) => Promise<unknown>>(),
};

const roomsService = {
  find: jest.fn<(id: number) => Promise<unknown>>(),
};

/** Identity of the caller: it always comes from the users table (RN-04). */
const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 3,
  username: 'receptionist-1',
  name: 'Maria Rojas (Via 40 branch)',
  role: Role.RECEPTIONIST,
  receptionistId: 1,
  passwordHash: 'hashed',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const buildDto = (overrides: Partial<CreateReservationDto> = {}): CreateReservationDto => ({
  guest: 'Juan Perez',
  guestDocument: '12345678',
  roomType: RoomType.SINGLE,
  checkInDate: '2027-02-13',
  checkOutDate: '2027-02-17',
  roomId: 1,
  ...overrides,
});

/**
 * Executes the call once and returns the error thrown. It allows asserting the
 * class and the message of a failure without invoking the service (and
 * consuming the mocks of the repository) twice.
 */
const failureOf = async (call: Promise<unknown>): Promise<Error> =>
  call.then(
    () => Promise.reject(new Error('The call was expected to fail, but it succeeded')),
    (error: unknown) => error as Error,
  );

describe('ReservationsService', () => {
  let service: ReservationsService;

  beforeEach(async () => {
    // Reset (not only clear): it also drops any leftover *Once* implementation
    // so a test cannot inherit the value queued by the previous one.
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: getRepositoryToken(Reservation), useValue: repository },
        { provide: USER_DIRECTORY, useValue: userDirectory },
        { provide: ReceptionistsService, useValue: receptionistsService },
        { provide: RoomsService, useValue: roomsService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);

    // Default happy path: an existing, active receptionist with a linked user
    // and an existing room.
    receptionistsService.find.mockResolvedValue({ id: 1, active: true });
    findReceptionistByReceptionistId.mockResolvedValue(buildUser({ id: 3 }));
    roomsService.find.mockResolvedValue({ id: 1, status: 'AVAILABLE' });
    repository.create.mockImplementation((data) => ({ id: 10, ...data }));
    repository.save.mockImplementation(async (entity) => ({ ...entity }));
    // Empty defaults: every test overrides them with a *Once* value, so no
    // implementation can leak from one test to the next one.
    repository.find.mockResolvedValue([]);
    repository.findOneBy.mockResolvedValue(undefined);
  });

  describe('create (RN-01)', () => {
    it('assigns the reservation to the receptionist that sends it and ignores the request value', async () => {
      const created = await service.create(
        buildDto({ guest: '  Juan Perez  ', receptionistId: 2 }),
        buildUser(),
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          receptionistId: 1,
          status: ReservationStatus.PENDING,
          guest: 'Juan Perez',
          roomId: 1,
        }),
      );
      expect(created).toMatchObject({ status: ReservationStatus.PENDING, receptionistId: 1 });
      // The receptionist does not choose anything: no lookup of the payload.
      expect(receptionistsService.find).not.toHaveBeenCalled();
      expect(findReceptionistByReceptionistId).not.toHaveBeenCalled();
    });

    it('answers 400 when the receptionist user is not linked to the receptionists table', async () => {
      const error = await failureOf(
        service.create(buildDto({ receptionistId: 2 }), buildUser({ receptionistId: null })),
      );

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain('not linked');
    });

    it('requires receptionistId for admins and coordinators', async () => {
      const adminError = await failureOf(service.create(buildDto(), buildUser({ role: Role.ADMIN })));
      const coordinatorError = await failureOf(
        service.create(buildDto(), buildUser({ role: Role.COORDINATOR })),
      );

      expect(adminError).toBeInstanceOf(BadRequestException);
      expect(adminError.message).toContain('required for admins and coordinators');
      expect(coordinatorError).toBeInstanceOf(BadRequestException);
      expect(receptionistsService.find).not.toHaveBeenCalled();
    });

    it('answers 400 when the receptionist does not exist', async () => {
      receptionistsService.find.mockResolvedValueOnce(null);

      await expect(
        service.create(buildDto({ receptionistId: 99 }), buildUser({ role: Role.ADMIN })),
      ).rejects.toThrow('does not exist');
    });

    it('answers 400 when the receptionist is no longer active', async () => {
      receptionistsService.find.mockResolvedValueOnce({ id: 1, active: false });

      await expect(
        service.create(buildDto({ receptionistId: 1 }), buildUser({ role: Role.ADMIN })),
      ).rejects.toThrow('is not active');
    });

    it('answers 400 when the receptionist row has no user with the receptionist role', async () => {
      findReceptionistByReceptionistId.mockResolvedValueOnce(undefined);

      await expect(
        service.create(buildDto({ receptionistId: 1 }), buildUser({ role: Role.ADMIN })),
      ).rejects.toThrow('does not belong to a user');
    });

    it('answers 400 when the room does not exist', async () => {
      roomsService.find.mockResolvedValueOnce(null);

      await expect(
        service.create(buildDto({ roomId: 999, receptionistId: 1 }), buildUser({ role: Role.ADMIN })),
      ).rejects.toThrow('Room with id "999" does not exist');
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('registers the reservation of an admin with an explicit receptionist', async () => {
      const created = await service.create(
        buildDto({ receptionistId: 1 }),
        buildUser({ role: Role.ADMIN }),
      );

      expect(receptionistsService.find).toHaveBeenCalledWith(1);
      expect(findReceptionistByReceptionistId).toHaveBeenCalledWith(1);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ receptionistId: 1, status: ReservationStatus.PENDING }),
      );
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(created).toMatchObject({ id: 10, status: ReservationStatus.PENDING });
    });
  });

  describe('findAll (RN-02)', () => {
    it('only asks for the reservations of the receptionist that is logged in', async () => {
      repository.find.mockResolvedValueOnce([]);

      await service.findAll({}, buildUser());

      expect(repository.find).toHaveBeenCalledWith({
        where: { receptionistId: 1 },
        order: { createdAt: 'DESC' },
      });
    });

    it('does not restrict the query when the receptionist has no linked row', async () => {
      repository.find.mockResolvedValueOnce([]);

      await service.findAll({}, buildUser({ receptionistId: null }));

      const options = repository.find.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(options.where).not.toHaveProperty('receptionistId');
      expect(options.where).toEqual({});
    });

    it('lets admin and coordinator see the whole chain', async () => {
      repository.find.mockResolvedValueOnce([]);

      await service.findAll({}, buildUser({ role: Role.ADMIN }));

      const options = repository.find.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(options.where).toEqual({});
    });

    it('combines the status filter with the restriction of the role', async () => {
      repository.find.mockResolvedValueOnce([]);

      await service.findAll({ status: ReservationStatus.CONFIRMED }, buildUser());

      expect(repository.find).toHaveBeenCalledWith({
        where: { receptionistId: 1, status: ReservationStatus.CONFIRMED },
        order: { createdAt: 'DESC' },
      });
    });

    it('returns the rows newest first', async () => {
      const rows = [{ id: 2, createdAt: new Date() }, { id: 1, createdAt: new Date() }];
      repository.find.mockResolvedValueOnce(rows);

      await expect(service.findAll({}, buildUser({ role: Role.ADMIN }))).resolves.toEqual(rows);
      expect(repository.find).toHaveBeenCalledWith({ where: {}, order: { createdAt: 'DESC' } });
    });
  });

  describe('findOne (RN-05)', () => {
    it('answers 404 when the id does not exist', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);

      await expect(service.findOne(999, buildUser({ role: Role.ADMIN }))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('answers 403 when a receptionist asks for a reservation of another receptionist', async () => {
      repository.findOneBy.mockResolvedValueOnce({ id: 1, receptionistId: 2 });

      const error = await failureOf(service.findOne(1, buildUser()));

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toContain('not allowed');
    });

    it('returns the reservation when it belongs to the receptionist', async () => {
      repository.findOneBy.mockResolvedValueOnce({ id: 1, receptionistId: 1 });

      await expect(service.findOne(1, buildUser())).resolves.toMatchObject({
        id: 1,
        receptionistId: 1,
      });
    });

    it('lets admin and coordinator read any reservation', async () => {
      repository.findOneBy.mockResolvedValue({ id: 7, receptionistId: 2 });

      await expect(
        service.findOne(7, buildUser({ role: Role.COORDINATOR })),
      ).resolves.toMatchObject({ id: 7 });
      await expect(service.findOne(7, buildUser({ role: Role.ADMIN }))).resolves.toMatchObject({
        id: 7,
      });
    });
  });

  describe('updateStatus (RN-03)', () => {
    const reservationWith = (status: ReservationStatus, receptionistId = 1): Reservation =>
      ({ id: 5, status, receptionistId }) as Reservation;

    it('moves a reservation from PENDING to CONFIRMED and saves it', async () => {
      repository.findOneBy.mockResolvedValueOnce(reservationWith(ReservationStatus.PENDING));

      const updated = await service.updateStatus(
        5,
        { status: ReservationStatus.CONFIRMED } as UpdateStatusDto,
        buildUser({ role: Role.ADMIN }),
      );

      expect(updated.status).toBe(ReservationStatus.CONFIRMED);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReservationStatus.CONFIRMED }),
      );
    });

    it('answers 409 when the transition is not allowed by the state machine', async () => {
      repository.findOneBy.mockResolvedValueOnce(reservationWith(ReservationStatus.PENDING));

      const error = await failureOf(
        service.updateStatus(
          5,
          { status: ReservationStatus.IN_PROGRESS } as UpdateStatusDto,
          buildUser({ role: Role.ADMIN }),
        ),
      );

      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toContain('Invalid status transition');
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('answers 403 when a receptionist tries to cancel, even their own reservation', async () => {
      repository.findOneBy.mockResolvedValueOnce(reservationWith(ReservationStatus.PENDING));

      const error = await failureOf(
        service.updateStatus(
          5,
          { status: ReservationStatus.CANCELLED } as UpdateStatusDto,
          buildUser(),
        ),
      );

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toContain('cannot cancel');
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('answers 403 before anything else when a receptionist touches another reservation', async () => {
      repository.findOneBy.mockResolvedValueOnce(reservationWith(ReservationStatus.PENDING, 2));

      await expect(
        service.updateStatus(
          5,
          { status: ReservationStatus.CONFIRMED } as UpdateStatusDto,
          buildUser(),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('answers 404 when the reservation does not exist', async () => {
      repository.findOneBy.mockResolvedValueOnce(null);

      await expect(
        service.updateStatus(
          999,
          { status: ReservationStatus.CONFIRMED } as UpdateStatusDto,
          buildUser({ role: Role.ADMIN }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allows a coordinator to cancel a CONFIRMED reservation', async () => {
      repository.findOneBy.mockResolvedValueOnce(reservationWith(ReservationStatus.CONFIRMED));

      const updated = await service.updateStatus(
        5,
        { status: ReservationStatus.CANCELLED } as UpdateStatusDto,
        buildUser({ role: Role.COORDINATOR }),
      );

      expect(updated.status).toBe(ReservationStatus.CANCELLED);
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('answers 409 from a final status, so FINISHED cannot change anymore', async () => {
      repository.findOneBy.mockResolvedValueOnce(reservationWith(ReservationStatus.FINISHED));

      await expect(
        service.updateStatus(
          5,
          { status: ReservationStatus.IN_PROGRESS } as UpdateStatusDto,
          buildUser({ role: Role.ADMIN }),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('summary', () => {
    it('returns one row per status with the count of each one', async () => {
      repository.count.mockImplementation(async ({ where }) =>
        where.status === ReservationStatus.PENDING ? 3 : 0,
      );

      const summary = await service.summary();

      expect(summary).toHaveLength(5);
      expect(summary.map((row) => row.status)).toEqual([
        ReservationStatus.PENDING,
        ReservationStatus.CONFIRMED,
        ReservationStatus.IN_PROGRESS,
        ReservationStatus.FINISHED,
        ReservationStatus.CANCELLED,
      ]);
      expect(summary[0]).toEqual({ status: ReservationStatus.PENDING, total: 3 });
      expect(repository.count).toHaveBeenCalledTimes(5);
    });
  });
});
