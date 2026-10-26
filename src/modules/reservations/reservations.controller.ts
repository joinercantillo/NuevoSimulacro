import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { Role } from '../../common/enums/role.enum.js';
import type { User } from '../users/entities/user.entity.js';

import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { FilterReservationsDto } from './dto/filter-reservations.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { ReservationStatus } from './enums/reservation-status.enum.js';
import { Reservation } from './entities/reservation.entity.js';
import { ReservationsService } from './reservations.service.js';

const EXAMPLE_RESERVATION = {
  id: 1,
  guest: 'Juan Perez',
  guestDocument: '12345678',
  roomType: 'SUITE',
  checkInDate: '2027-02-13',
  checkOutDate: '2027-02-17',
  receptionistId: 1,
  roomId: 3,
  status: 'PENDING',
  createdAt: '2026-10-25T15:04:05.000Z',
  updatedAt: '2026-10-25T15:04:05.000Z',
};

@ApiTags('Reservations')
@ApiSecurity('API Key')
@ApiSecurity('User')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.RECEPTIONIST)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a reservation',
    description:
      'Any valid role can register. The initial status is always PENDING. A receptionist registers ' +
      'on their own behalf (the receptionistId value is ignored); admin and coordinator must send a ' +
      'receptionistId that exists, is active and belongs to a receptionist user. roomId must exist.',
  })
  @ApiCreatedResponse({
    description: 'Reservation created',
    schema: { example: { success: true, data: EXAMPLE_RESERVATION } },
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'Invalid DTO, wrong dates, unknown room or invalid receptionist',
  })
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Missing x-api-key, invalid key or unknown x-user',
  })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Role not allowed' })
  create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() user: User,
  ): Promise<Reservation> {
    return this.reservationsService.create(createReservationDto, user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.RECEPTIONIST)
  @ApiOperation({
    summary: 'List the reservations the user is allowed to see',
    description:
      'admin and coordinator see the whole chain; a receptionist only sees their own reservations. ' +
      'The optional ?status= filter is combined with that restriction.',
  })
  @ApiOkResponse({
    description: 'Visible reservations',
    schema: { example: { success: true, data: [EXAMPLE_RESERVATION] } },
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'The status filter value is not part of the catalogue',
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Invalid identity' })
  findAll(
    @Query() filterReservationsDto: FilterReservationsDto,
    @CurrentUser() user: User,
  ): Promise<Reservation[]> {
    return this.reservationsService.findAll(filterReservationsDto, user);
  }

  @Get('summary')
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @ApiOperation({
    summary: 'Reservations count per status for the whole chain',
    description: 'Restricted to admin and coordinator.',
  })
  @ApiOkResponse({
    description: 'Count per status',
    schema: {
      example: {
        success: true,
        data: [
          { status: 'PENDING', total: 3 },
          { status: 'CONFIRMED', total: 2 },
          { status: 'IN_PROGRESS', total: 1 },
          { status: 'FINISHED', total: 0 },
          { status: 'CANCELLED', total: 1 },
        ],
      },
    },
  })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'A receptionist cannot read the summary',
  })
  summary(): Promise<{ status: ReservationStatus; total: number }[]> {
    return this.reservationsService.summary();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.RECEPTIONIST)
  @ApiOperation({
    summary: 'Get one reservation',
    description:
      'Knowing the id is not enough: a receptionist can only read reservations assigned to them.',
  })
  @ApiParam({ name: 'id', description: 'Reservation id', example: 1 })
  @ApiOkResponse({
    description: 'Reservation detail',
    schema: { example: { success: true, data: EXAMPLE_RESERVATION } },
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'The id is not a number',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Reservation does not exist' })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Reservation belongs to another receptionist',
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Invalid identity' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<Reservation> {
    return this.reservationsService.findOne(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.RECEPTIONIST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change the status of a reservation',
    description:
      'Only the "status" field is accepted. admin and coordinator can change any reservation; a ' +
      'receptionist only their own and can never cancel. Status jumps are not allowed.',
  })
  @ApiParam({ name: 'id', description: 'Reservation id', example: 1 })
  @ApiOkResponse({
    description: 'Reservation with the new status',
    schema: {
      example: { success: true, data: { ...EXAMPLE_RESERVATION, status: 'CONFIRMED' } },
    },
  })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Unknown status or fields that do not belong to the operation',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Reservation does not exist' })
  @ApiForbiddenResponse({
    type: ErrorResponseDto,
    description: 'Reservation of another user or cancellation by a receptionist',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Invalid transition (status jump, final status, ...)',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
    @CurrentUser() user: User,
  ): Promise<Reservation> {
    return this.reservationsService.updateStatus(id, updateStatusDto, user);
  }
}
