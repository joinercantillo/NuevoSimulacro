import { Role } from '../../../common/enums/role.enum.js';
import { ReservationStatus } from '../enums/maintenance-status.enum.js';
import {
  VALID_TRANSITIONS,
  canCancel,
  isFinalStatus,
  isOwner,
  isValidTransition,
} from './status-rules.js';

describe('status rules (RN-03)', () => {
  it('declares the expected allowed transitions', () => {
    expect(VALID_TRANSITIONS).toEqual({
      [ReservationStatus.PENDING]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
      [ReservationStatus.CONFIRMED]: [ReservationStatus.IN_PROGRESS, ReservationStatus.CANCELLED],
      [ReservationStatus.IN_PROGRESS]: [ReservationStatus.FINISHED],
      [ReservationStatus.FINISHED]: [],
      [ReservationStatus.CANCELLED]: [],
    });
  });

  it.each([
    [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
    [ReservationStatus.PENDING, ReservationStatus.CANCELLED],
    [ReservationStatus.CONFIRMED, ReservationStatus.IN_PROGRESS],
    [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
    [ReservationStatus.IN_PROGRESS, ReservationStatus.FINISHED],
  ])('allows %s -> %s', (current, requested) => {
    expect(isValidTransition(current, requested)).toBe(true);
  });

  it.each([
    [ReservationStatus.PENDING, ReservationStatus.IN_PROGRESS],
    [ReservationStatus.PENDING, ReservationStatus.FINISHED],
    [ReservationStatus.PENDING, ReservationStatus.PENDING],
    [ReservationStatus.CONFIRMED, ReservationStatus.PENDING],
    [ReservationStatus.CONFIRMED, ReservationStatus.FINISHED],
    [ReservationStatus.IN_PROGRESS, ReservationStatus.CANCELLED],
    [ReservationStatus.FINISHED, ReservationStatus.CONFIRMED],
    [ReservationStatus.CANCELLED, ReservationStatus.CONFIRMED],
  ])('rejects the jump %s -> %s', (current, requested) => {
    expect(isValidTransition(current, requested)).toBe(false);
  });

  it('only FINISHED and CANCELLED are final statuses', () => {
    expect(isFinalStatus(ReservationStatus.FINISHED)).toBe(true);
    expect(isFinalStatus(ReservationStatus.CANCELLED)).toBe(true);
    expect(isFinalStatus(ReservationStatus.PENDING)).toBe(false);
    expect(isFinalStatus(ReservationStatus.CONFIRMED)).toBe(false);
    expect(isFinalStatus(ReservationStatus.IN_PROGRESS)).toBe(false);
  });

  it('only admin and coordinator can cancel', () => {
    expect(canCancel(Role.ADMIN)).toBe(true);
    expect(canCancel(Role.COORDINATOR)).toBe(true);
    expect(canCancel(Role.RECEPTIONIST)).toBe(false);
  });

  it('a receptionist only owns their reservations', () => {
    expect(isOwner(Role.RECEPTIONIST, 1, 1)).toBe(true);
    expect(isOwner(Role.RECEPTIONIST, 2, 1)).toBe(false);
    expect(isOwner(Role.RECEPTIONIST, undefined, 1)).toBe(false);
  });

  it('admin and coordinator access any reservation', () => {
    expect(isOwner(Role.ADMIN, 7, undefined)).toBe(true);
    expect(isOwner(Role.COORDINATOR, 7, undefined)).toBe(true);
  });
});
