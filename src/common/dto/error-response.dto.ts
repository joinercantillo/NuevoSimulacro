import { ApiProperty } from '@nestjs/swagger';

/** Normalised shape of any error returned by the API. */
export class ErrorResponseDto {
  @ApiProperty({ example: 409, description: 'Real HTTP status code of the error' })
  statusCode: number;

  @ApiProperty({
    example: 'Invalid status transition: the reservation is in "PENDING" and "IN_PROGRESS" was requested',
    description: 'Human readable error message',
  })
  message: string;

  @ApiProperty({ example: 'Conflict', description: 'HTTP reason phrase' })
  error: string;

  @ApiProperty({ example: '/reservations/8f1d.../status', description: 'Requested route' })
  path: string;

  @ApiProperty({
    example: '2026-10-25T15:04:05.000Z',
    description: 'ISO 8601 date and time when the error occurred',
  })
  timestamp: string;

  @ApiProperty({ example: false, description: 'Always false on error responses' })
  success: false;

  @ApiProperty({
    example: ['roomType must be SINGLE, DOUBLE or SUITE'],
    description: 'Additional detail, for example the list of validation errors',
    required: false,
  })
  details?: string[];
}
