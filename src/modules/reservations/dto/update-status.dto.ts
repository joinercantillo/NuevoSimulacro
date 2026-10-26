import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ReservationStatus } from '../enums/reservation-status.enum.js';

/**
 * Status change DTO (PATCH /reservations/:id/status).
 * It is the only accepted field: the global ValidationPipe rejects any attempt
 * to modify protected properties of the reservation.
 */
export class UpdateStatusDto {
  @ApiProperty({
    description: 'New status of the reservation',
    enum: ReservationStatus,
    example: ReservationStatus.CONFIRMED,
  })
  @IsEnum(ReservationStatus, {
    message: 'status must be PENDING, CONFIRMED, IN_PROGRESS, FINISHED or CANCELLED',
  })
  status: ReservationStatus;
}
