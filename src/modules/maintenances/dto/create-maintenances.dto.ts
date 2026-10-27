import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import { brandCar } from '../../cars/enums/car-type.enum.js';
import { getStayErrors } from '../rules/stay-rules.js';

/**
 * Personalised class validator for the stay dates:
 * - checkOutDate must be after checkInDate.
 * - checkInDate cannot be in the past.
 * It is registered on checkOutDate and receives the whole DTO in args.object.
 */
@ValidatorConstraint({ name: 'stayDates', async: false })
export class StayDatesValidator implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    return getStayErrors(args.object).length === 0;
  }

  defaultMessage(args: ValidationArguments): string {
    return getStayErrors(args.object).join(' | ');
  }
}

/**
 * Registration DTO.
 *
 * It does not contain `id`, `status`, `createdAt` or `updatedAt`: those values
 * belong to the system and any attempt to send them is rejected by the global
 * ValidationPipe (`whitelist` + `forbidNonWhitelisted`).
 */
export class CreateReservationDto {
  @ApiProperty({ description: 'Full name of the guest', example: 'Juan Perez' })
  @IsString({ message: 'guest must be a string' })
  @IsNotEmpty({ message: 'guest is required' })
  @MaxLength(100, { message: 'guest cannot exceed 100 characters' })
  @Matches(/\S/, { message: 'guest cannot be an empty string' })
  guest: string;

  @ApiProperty({
    description: 'Guest document: digits only, between 6 and 12 characters',
    example: '12345678',
  })
  @IsString({ message: 'guestDocument must be a string' })
  @Matches(/^\d{6,12}$/, {
    message: 'guestDocument must contain digits only (between 6 and 12 characters)',
  })
  guestDocument: string;

  @ApiProperty({ description: 'Booked room type', enum: brandCar, example: 'SUITE' })
  @IsEnum(brandCar, { message: 'roomType must be SINGLE, DOUBLE or SUITE' })
  roomType: brandCar;

  @ApiProperty({
    description: 'Arrival date in ISO 8601 format. It cannot be in the past',
    example: '2027-02-13',
  })
  @IsISO8601({ strict: true }, { message: 'checkInDate must be a valid ISO 8601 date' })
  checkInDate: string;

  @ApiProperty({
    description: 'Departure date in ISO 8601 format. It must be after checkInDate',
    example: '2027-02-17',
  })
  @IsISO8601({ strict: true }, { message: 'checkOutDate must be a valid ISO 8601 date' })
  @Validate(StayDatesValidator)
  checkOutDate: string;

  @ApiProperty({
    description:
      'Room assigned to the reservation. Must exist in the rooms table (see GET /rooms).',
    example: 3,
  })
  @IsInt({ message: 'roomId must be an integer' })
  @Min(1, { message: 'roomId must be greater than zero' })
  roomId: number;

  @ApiPropertyOptional({
    description:
      'Responsible receptionist. Required for admin and coordinator and must be an active ' +
      'receptionist (see GET /receptionists). If a receptionist sends the request the value ' +
      'is ignored and their own row is used.',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: 'receptionistId must be an integer' })
  @Min(1, { message: 'receptionistId must be greater than zero' })
  receptionistId?: number;
}
