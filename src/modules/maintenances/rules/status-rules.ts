import { Role } from '../../../common/enums/role.enum.js';
import { ReservationStatus } from '../enums/maintenance-status.enum.js';

/**
 * RN-03: state machine of a reservation.
 * No status jumps and no way back from a final status.
 */
export const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  [ReservationStatus.SCHEDULED]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED]: [ReservationStatus.IN_PROGRESS, ReservationStatus.CANCELLED],
  [ReservationStatus.IN_PROGRESS]: [ReservationStatus.COMPLETED],
  [ReservationStatus.COMPLETED]: [],
  [ReservationStatus.CANCELLED]: [],
};

export const isValidTransition = (
  currentStatus: ReservationStatus,
  requestedStatus: ReservationStatus,
): boolean => (VALID_TRANSITIONS[currentStatus] ?? []).includes(requestedStatus);

export const isFinalStatus = (status: ReservationStatus): boolean =>
  (VALID_TRANSITIONS[status] ?? []).length === 0;

/** Cancelling is exclusive to admin and coordinator. */
export const canCancel = (role: Role): boolean =>
  role === Role.ADMIN 

/** Receptionists only see and modify their own reservations. */
export const isOwner = (
  role: Role,
  reservationReceptionistId: number | null | undefined,
  userReceptionistId: number | null | undefined,
): boolean => role !== Role.TECHNICIAN || reservationReceptionistId === userReceptionistId;
