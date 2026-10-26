import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js';

/** Values defined in jest.e2e.config.js (embedded PostgreSQL). */
const API_KEY = 'test-key-via40';
const USERS = {
  admin: 'admin-1',
  coordinator: 'coordinator-1',
  receptionist1: 'receptionist-1',
  receptionist2: 'receptionist-2',
};

const isoDaysFromToday = (offset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const payload = (overrides: Record<string, unknown> = {}) => ({
  guest: 'Juan Perez',
  guestDocument: '12345678',
  roomType: 'SINGLE',
  checkInDate: isoDaysFromToday(10),
  checkOutDate: isoDaysFromToday(14),
  roomId: 1,
  ...overrides,
});

describe('Reservations API (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  const headers = (user?: string, apiKey: string | null = API_KEY): Record<string, string> => {
    const result: Record<string, string> = {};
    if (apiKey) result['x-api-key'] = apiKey;
    if (user) result['x-user'] = user;
    return result;
  };

  const get = (url: string, user = USERS.admin, apiKey: string | null = API_KEY) =>
    request(server).get(url).set(headers(user, apiKey));

  const post = (
    url: string,
    body: Record<string, unknown>,
    user = USERS.admin,
    apiKey: string | null = API_KEY,
  ) => request(server).post(url).set(headers(user, apiKey)).send(body);

  const patch = (url: string, body: Record<string, unknown>, user = USERS.admin) =>
    request(server).patch(url).set(headers(user)).send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();

    // Same global elements as src/main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  // Reservations created along the suite, reused by the status machine tests.
  let coordinatorCreatedId: number;
  let receptionist1ReservationId: number;
  let receptionist2ReservationId: number;
  let pendingForTransitionId: number;

  describe('API key and user identity (RN-04)', () => {
    it('answers 401 when the x-api-key header is missing', async () => {
      const response = await get('/hotels', USERS.admin, null);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('x-api-key');
    });

    it('answers 401 when the API key is not valid', async () => {
      const response = await get('/hotels', USERS.admin, 'not-a-valid-key');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid API key');
    });

    it('answers 401 when the x-user header is missing', async () => {
      const response = await request(server).get('/hotels').set('x-api-key', API_KEY);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('x-user');
    });

    it('answers 401 when the user does not exist', async () => {
      const response = await get('/hotels', 'ghost-user');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('ghost-user');
    });

    it('accepts a valid key and a valid user', async () => {
      const response = await get('/hotels');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('seeded master data', () => {
    it('lists the three branches of the chain', async () => {
      const response = await get('/hotels');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toMatchObject({ id: 1, name: 'Arenosa Via 40', active: true });
    });

    it('lists the six rooms with their branch', async () => {
      const response = await get('/rooms');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(6);
      expect(response.body.data[0].hotel).toMatchObject({ id: 1 });
      expect(response.body.data.map((room: { roomType: string }) => room.roomType)).toEqual([
        'SINGLE',
        'DOUBLE',
        'SUITE',
        'DOUBLE',
        'SUITE',
        'SINGLE',
      ]);
    });

    it('lists the two receptionists referenced by the test users', async () => {
      const response = await get('/receptionists');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.map((person: { id: number }) => person.id)).toEqual([1, 2]);
    });
  });

  describe('create a reservation (RN-01)', () => {
    it('creates a reservation as a receptionist on their own behalf (status PENDING)', async () => {
      const response = await post('/reservations', payload({ receptionistId: 2 }), USERS.receptionist1);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        guest: 'Juan Perez',
        guestDocument: '12345678',
        roomType: 'SINGLE',
        status: 'PENDING',
        receptionistId: 1,
        roomId: 1,
      });
      expect(typeof response.body.data.id).toBe('number');
      expect(response.body.data.checkInDate).toBe(isoDaysFromToday(10));
      expect(response.body.data.checkOutDate).toBe(isoDaysFromToday(14));

      receptionist1ReservationId = response.body.data.id;
    });

    it('ignores the receptionistId sent by a receptionist', async () => {
      const response = await post('/reservations', payload({ receptionistId: 2 }), USERS.receptionist1);

      expect(response.status).toBe(201);
      expect(response.body.data.receptionistId).toBe(1);
    });

    it('creates a reservation as a coordinator with an explicit receptionist', async () => {
      const response = await post(
        '/reservations',
        payload({ receptionistId: 1, roomType: 'DOUBLE', roomId: 2 }),
        USERS.coordinator,
      );

      expect(response.status).toBe(201);
      expect(response.body.data.receptionistId).toBe(1);

      coordinatorCreatedId = response.body.data.id;
    });

    it('creates a reservation as an admin for another branch receptionist', async () => {
      const response = await post(
        '/reservations',
        payload({ receptionistId: 2, roomType: 'SUITE', roomId: 5 }),
      );

      expect(response.status).toBe(201);
      expect(response.body.data.receptionistId).toBe(2);

      receptionist2ReservationId = response.body.data.id;
    });

    it('requires receptionistId for admins and coordinators', async () => {
      const response = await post('/reservations', payload());

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('receptionistId');
    });

    it('rejects a receptionistId that does not exist', async () => {
      const response = await post('/reservations', payload({ receptionistId: 999 }));

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('does not exist');
    });

    it('rejects a roomId that does not exist', async () => {
      const response = await post('/reservations', payload({ receptionistId: 1, roomId: 999 }));

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Room with id "999"');
    });

    it('rejects protected fields such as status or id', async () => {
      const response = await post(
        '/reservations',
        payload({ receptionistId: 1, status: 'FINISHED', id: 55 }),
      );

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('status'),
          expect.stringContaining('id'),
        ]),
      );
    });

    it('rejects a document that is not 6 to 12 digits', async () => {
      const response = await post(
        '/reservations',
        payload({ receptionistId: 1, guestDocument: 'ABC-123' }),
      );

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual([
        expect.stringContaining('guestDocument'),
      ]);
    });

    it('rejects a roomType outside the catalogue', async () => {
      const response = await post(
        '/reservations',
        payload({ receptionistId: 1, roomType: 'TRIPLE' }),
      );

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual([expect.stringContaining('roomType')]);
    });

    it('rejects a check-out that is not after the check-in', async () => {
      const response = await post(
        '/reservations',
        payload({
          receptionistId: 1,
          checkInDate: isoDaysFromToday(5),
          checkOutDate: isoDaysFromToday(5),
        }),
      );

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(['checkOutDate must be after checkInDate']);
    });

    it('rejects a check-in date in the past', async () => {
      const response = await post(
        '/reservations',
        payload({
          receptionistId: 1,
          checkInDate: isoDaysFromToday(-1),
          checkOutDate: isoDaysFromToday(3),
        }),
      );

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual([
        expect.stringContaining('checkInDate cannot be in the past'),
      ]);
    });

    it('rejects a date that is not ISO 8601', async () => {
      const response = await post(
        '/reservations',
        payload({ receptionistId: 1, checkInDate: '13/02/2027' }),
      );

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual([expect.stringContaining('checkInDate')]);
    });

    it('normalises every error response (RN-06)', async () => {
      const response = await post('/reservations', payload({ receptionistId: 999 }));

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        path: '/reservations',
      });
      expect(typeof response.body.message).toBe('string');
      expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('list the reservations (RN-02)', () => {
    it('returns an array of reservations to an admin', async () => {
      const response = await get('/reservations');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('only returns the reservations of the receptionist in the x-user header', async () => {
      const response = await get('/reservations', USERS.receptionist1);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.every(
          (reservation: { receptionistId: number }) => reservation.receptionistId === 1,
        ),
      ).toBe(true);
    });

    it('filters by status without dropping the role restriction', async () => {
      const response = await get('/reservations?status=PENDING', USERS.receptionist1);

      expect(response.status).toBe(200);
      expect(
        response.body.data.every(
          (reservation: { receptionistId: number; status: string }) =>
            reservation.receptionistId === 1 && reservation.status === 'PENDING',
        ),
      ).toBe(true);
    });

    it('rejects a status that is not part of the catalogue', async () => {
      const response = await get('/reservations?status=APPROVED');

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual([expect.stringContaining('status')]);
    });

    it('rejects unknown query parameters', async () => {
      const response = await get('/reservations?foo=bar');

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual([expect.stringContaining('foo')]);
    });
  });

  describe('change the status (RN-03)', () => {
    beforeAll(async () => {
      // Reservations used by the transition scenarios.
      const pending = await post(
        '/reservations',
        payload({ receptionistId: 1, guest: 'Transition Guest' }),
      );
      pendingForTransitionId = pending.body.data.id;

      const receptionist2 = await post(
        '/reservations',
        payload({ receptionistId: 2, guest: 'Other Branch Guest' }),
      );
      receptionist2ReservationId = receptionist2.body.data.id;
    });

    it('moves PENDING to CONFIRMED as admin', async () => {
      const response = await patch(`/reservations/${pendingForTransitionId}/status`, {
        status: 'CONFIRMED',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('CONFIRMED');
    });

    it('rejects the jump PENDING to IN_PROGRESS with 409', async () => {
      const created = await post('/reservations', payload({ receptionistId: 1 }));
      const response = await patch(`/reservations/${created.body.data.id}/status`, {
        status: 'IN_PROGRESS',
      });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('Invalid status transition');
      expect(response.body.error).toBe('Conflict');
    });

    it('moves CONFIRMED to IN_PROGRESS as coordinator', async () => {
      const response = await patch(
        `/reservations/${pendingForTransitionId}/status`,
        { status: 'IN_PROGRESS' },
        USERS.coordinator,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('IN_PROGRESS');
    });

    it('moves IN_PROGRESS to FINISHED and blocks later changes', async () => {
      const finished = await patch(`/reservations/${pendingForTransitionId}/status`, {
        status: 'FINISHED',
      });
      expect(finished.status).toBe(200);
      expect(finished.body.data.status).toBe('FINISHED');

      const blocked = await patch(`/reservations/${pendingForTransitionId}/status`, {
        status: 'CONFIRMED',
      });
      expect(blocked.status).toBe(409);
      expect(blocked.body.message).toContain('FINISHED');
    });

    it('a receptionist cannot cancel, not even their own reservation', async () => {
      const created = await post('/reservations', payload(), USERS.receptionist1);
      const response = await patch(
        `/reservations/${created.body.data.id}/status`,
        { status: 'CANCELLED' },
        USERS.receptionist1,
      );

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('cancel');
    });

    it('an admin can cancel a PENDING reservation', async () => {
      const created = await post('/reservations', payload({ receptionistId: 2 }));
      const cancelled = await patch(`/reservations/${created.body.data.id}/status`, {
        status: 'CANCELLED',
      });

      expect(cancelled.status).toBe(200);
      expect(cancelled.body.data.status).toBe('CANCELLED');

      const blocked = await patch(`/reservations/${created.body.data.id}/status`, {
        status: 'CONFIRMED',
      });
      expect(blocked.status).toBe(409);
      expect(blocked.body.message).toContain('CANCELLED');
    });

    it('a coordinator can cancel a CONFIRMED reservation', async () => {
      const created = await post('/reservations', payload({ receptionistId: 1 }));
      await patch(`/reservations/${created.body.data.id}/status`, { status: 'CONFIRMED' });

      const response = await patch(
        `/reservations/${created.body.data.id}/status`,
        { status: 'CANCELLED' },
        USERS.coordinator,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('CANCELLED');
    });

    it('a receptionist cannot change a reservation of another receptionist', async () => {
      const response = await patch(
        `/reservations/${receptionist2ReservationId}/status`,
        { status: 'CONFIRMED' },
        USERS.receptionist1,
      );

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('not assigned to your user');
    });

    it('a receptionist can change their own reservation', async () => {
      const response = await patch(
        `/reservations/${receptionist1ReservationId}/status`,
        { status: 'CONFIRMED' },
        USERS.receptionist1,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('CONFIRMED');
    });

    it('an admin can change a reservation of any receptionist', async () => {
      const response = await patch(`/reservations/${receptionist2ReservationId}/status`, {
        status: 'CONFIRMED',
      });

      expect(response.status).toBe(200);
      expect(response.body.data.receptionistId).toBe(2);
      expect(response.body.data.status).toBe('CONFIRMED');
    });

    it('rejects a status that is not part of the catalogue', async () => {
      const response = await patch(`/reservations/${coordinatorCreatedId}/status`, {
        status: 'APPROVED',
      });

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual([expect.stringContaining('status')]);
    });

    it('rejects fields other than status', async () => {
      const response = await patch(`/reservations/${coordinatorCreatedId}/status`, {
        status: 'CONFIRMED',
        guest: 'Hackerman',
      });

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual([expect.stringContaining('guest')]);
    });

    it('answers 400 for a non numeric id and 404 for an unknown one', async () => {
      const invalidId = await patch('/reservations/abc/status', { status: 'CONFIRMED' });
      expect(invalidId.status).toBe(400);

      const unknownId = await patch('/reservations/999999/status', { status: 'CONFIRMED' });
      expect(unknownId.status).toBe(404);
      expect(unknownId.body.message).toContain('does not exist');
    });
  });

  describe('reservation detail (RN-05)', () => {
    it('returns the complete reservation to an admin', async () => {
      const response = await get(`/reservations/${coordinatorCreatedId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id: coordinatorCreatedId,
        roomType: 'DOUBLE',
        receptionistId: 1,
      });
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('updatedAt');
    });

    it('only lets a receptionist read their own reservation', async () => {
      const own = await get(`/reservations/${receptionist1ReservationId}`, USERS.receptionist1);
      expect(own.status).toBe(200);

      const foreign = await get(`/reservations/${receptionist2ReservationId}`, USERS.receptionist1);
      expect(foreign.status).toBe(403);
      expect(foreign.body.success).toBe(false);
    });

    it('answers 404 when the reservation does not exist', async () => {
      const response = await get('/reservations/999999');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('does not exist');
    });
  });

  describe('summary endpoint', () => {
    it('is forbidden for a receptionist', async () => {
      const response = await get('/reservations/summary', USERS.receptionist1);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('receptionist');
    });

    it('returns one row per status and the total matches the list', async () => {
      const summary = await get('/reservations/summary');
      const list = await get('/reservations');

      expect(summary.status).toBe(200);
      expect(summary.body.data).toHaveLength(5);
      expect(summary.body.data.map((row: { status: string }) => row.status)).toEqual([
        'PENDING',
        'CONFIRMED',
        'IN_PROGRESS',
        'FINISHED',
        'CANCELLED',
      ]);

      const total = summary.body.data.reduce(
        (accumulator: number, row: { total: number }) => accumulator + row.total,
        0,
      );
      expect(total).toBe(list.body.data.length);
    });

    it('is also available for a coordinator', async () => {
      const response = await get('/reservations/summary', USERS.coordinator);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
