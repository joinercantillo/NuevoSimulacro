import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReservationDto } from './create-reservation.dto.js';

const isoDaysFromToday = (offset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const build = (payload: Record<string, unknown>): CreateReservationDto =>
  plainToInstance(CreateReservationDto, payload);

const validateDto = (payload: Record<string, unknown>) =>
  validate(build(payload), { whitelist: true, forbidNonWhitelisted: true });

const messagesOf = (errors: Awaited<ReturnType<typeof validateDto>>): string[] =>
  errors.flatMap((error) => Object.values(error.constraints ?? {}));

describe('CreateReservationDto', () => {
  const validPayload = {
    guest: 'Juan Perez',
    guestDocument: '12345678',
    roomType: 'SINGLE',
    checkInDate: isoDaysFromToday(10),
    checkOutDate: isoDaysFromToday(14),
    roomId: 1,
    receptionistId: 1,
  };

  it('accepts a complete and consistent payload', async () => {
    await expect(validateDto(validPayload)).resolves.toEqual([]);
  });

  it('accepts the payload without receptionistId (a receptionist registers on their own behalf)', async () => {
    const { receptionistId: _ignored, ...withoutReceptionist } = validPayload;
    await expect(validateDto(withoutReceptionist)).resolves.toEqual([]);
  });

  it('rejects protected fields such as id, status or createdAt', async () => {
    const errors = await validateDto({ ...validPayload, status: 'FINISHED', id: 99 });

    expect(messagesOf(errors)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('status'),
        expect.stringContaining('id'),
      ]),
    );
  });

  it('rejects a guest that is missing or blank', async () => {
    const missing = await validateDto({ ...validPayload, guest: undefined });
    expect(messagesOf(missing)).toEqual(
      expect.arrayContaining([expect.stringContaining('guest')]),
    );

    const blank = await validateDto({ ...validPayload, guest: '   ' });
    expect(messagesOf(blank)).toEqual(expect.arrayContaining([expect.stringContaining('guest')]));
  });

  it('rejects a guestDocument that is not 6 to 12 digits', async () => {
    const short = await validateDto({ ...validPayload, guestDocument: '12345' });
    expect(messagesOf(short)).toEqual([expect.stringContaining('guestDocument')]);

    const letters = await validateDto({ ...validPayload, guestDocument: 'AB-12345' });
    expect(messagesOf(letters)).toEqual([expect.stringContaining('guestDocument')]);

    const long = await validateDto({ ...validPayload, guestDocument: '1234567890123' });
    expect(messagesOf(long)).toEqual([expect.stringContaining('guestDocument')]);
  });

  it('rejects a roomType outside the catalogue', async () => {
    const errors = await validateDto({ ...validPayload, roomType: 'TRIPLE' });
    expect(messagesOf(errors)).toEqual([expect.stringContaining('roomType')]);
  });

  it('rejects a date that is not ISO 8601', async () => {
    const errors = await validateDto({ ...validPayload, checkInDate: '13/02/2027' });
    expect(messagesOf(errors)).toEqual([expect.stringContaining('checkInDate')]);
  });

  it('rejects a check-out that is not after the check-in', async () => {
    const errors = await validateDto({
      ...validPayload,
      checkInDate: isoDaysFromToday(5),
      checkOutDate: isoDaysFromToday(5),
    });

    expect(messagesOf(errors)).toEqual(['checkOutDate must be after checkInDate']);
  });

  it('rejects a check-in date in the past', async () => {
    const errors = await validateDto({
      ...validPayload,
      checkInDate: isoDaysFromToday(-1),
      checkOutDate: isoDaysFromToday(3),
    });

    expect(messagesOf(errors)).toEqual([expect.stringContaining('checkInDate cannot be in the past')]);
  });

  it('requires roomId and rejects non positive values', async () => {
    const missing = await validateDto({ ...validPayload, roomId: undefined });
    expect(messagesOf(missing)).toEqual(
      expect.arrayContaining([expect.stringContaining('roomId')]),
    );

    const zero = await validateDto({ ...validPayload, roomId: 0 });
    expect(messagesOf(zero)).toEqual(expect.arrayContaining([expect.stringContaining('roomId')]));

    const text = await validateDto({ ...validPayload, roomId: 'first' });
    expect(messagesOf(text)).toEqual(expect.arrayContaining([expect.stringContaining('roomId')]));
  });
});
