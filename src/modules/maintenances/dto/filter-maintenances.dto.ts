import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ReservationStatus } from '../enums/maintenance-status.enum.js';

/** List filter (GET /reservations?status=CONFIRMED). */
export class FilterReservationsDto {
  @ApiPropertyOptional({
    description: 'Filters the list by status. It is combined with the role restrictions.',
    enum: ReservationStatus,
    example: ReservationStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(ReservationStatus, {
    message: 'status must be PENDING, CONFIRMED, IN_PROGRESS, FINISHED or CANCELLED',
  })
  status?: ReservationStatus;
}
