import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum.js';
import { ReceptionistsService } from '../receptionists/receptionists.service.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { User } from '../users/user.js';
import { UsersService } from '../users/users.service.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { FilterReservationsDto } from './dto/filter-reservations.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { ReservationStatus } from './enums/reservation-status.enum.js';
import { Reservation } from './entities/reservation.entity.js';
import { canCancel, isOwner, isValidTransition } from './rules/status-rules.js';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    private readonly usersService: UsersService,
    private readonly receptionistsService: ReceptionistsService,
    private readonly roomsService: RoomsService,
  ) {}

  /**
   * RN-01: registers a reservation. The status is always PENDING and the
   * responsible receptionist depends on the role of the caller.
   */
  async create(dto: CreateReservationDto, user: User): Promise<Reservation> {
    const receptionistId = await this.resolveReceptionistId(dto, user);

    const room = await this.roomsService.find(dto.roomId);
    if (!room) {
      throw new BadRequestException(`Room with id "${dto.roomId}" does not exist`);
    }

    const reservation = this.reservationsRepository.create({
      guest: dto.guest.trim(),
      guestDocument: dto.guestDocument,
      roomType: dto.roomType,
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      receptionistId,
      roomId: dto.roomId,
      status: ReservationStatus.PENDING,
    });

    return this.reservationsRepository.save(reservation);
  }

  /**
   * RN-02: the filtering happens inside the database query.
   * A receptionist only gets their own reservations and the `status` filter is
   * combined with that restriction, never replaced by it.
   */
  async findAll(query: FilterReservationsDto, user: User): Promise<Reservation[]> {
    const where: FindOptionsWhere<Reservation> = {};

    if (user.role === Role.RECEPTIONIST && user.receptionistId !== undefined) {
      where.receptionistId = user.receptionistId;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.reservationsRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  /** The access rules also apply to the individual lookup. */
  async findOne(id: number, user: User): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOneBy({ id });

    if (!reservation) {
      throw new NotFoundException(`Reservation with id "${id}" does not exist`);
    }

    this.assertOwnership(reservation, user);
    return reservation;
  }

  /** RN-03: ownership, state machine and cancellation permission. */
  async updateStatus(
    id: number,
    dto: UpdateStatusDto,
    user: User,
  ): Promise<Reservation> {
    const reservation = await this.findOne(id, user);

    if (!isValidTransition(reservation.status, dto.status)) {
      throw new ConflictException(
        `Invalid status transition: the reservation is in "${reservation.status}" and "${dto.status}" was requested`,
      );
    }

    if (dto.status === ReservationStatus.CANCELLED && !canCancel(user.role)) {
      throw new ForbiddenException(
        `Role "${user.role}" cannot cancel reservations: this action belongs to admin and coordinator`,
      );
    }

    reservation.status = dto.status;
    return this.reservationsRepository.save(reservation);
  }

  /** Status count for the whole chain (admin and coordinator only). */
  async summary(): Promise<{ status: ReservationStatus; total: number }[]> {
    const statuses = Object.values(ReservationStatus);

    return Promise.all(
      statuses.map(async (status) => ({
        status,
        total: await this.reservationsRepository.count({ where: { status } }),
      })),
    );
  }

  private async resolveReceptionistId(dto: CreateReservationDto, user: User): Promise<number> {
    // A receptionist can only register reservations on their own behalf;
    // any value sent by the client is ignored.
    if (user.role === Role.RECEPTIONIST) {
      if (user.receptionistId === undefined) {
        throw new BadRequestException(
          `Receptionist user "${user.id}" is not linked to a row in the receptionists table`,
        );
      }
      return user.receptionistId;
    }

    if (dto.receptionistId === undefined) {
      throw new BadRequestException(
        'The "receptionistId" field is required for admins and coordinators',
      );
    }

    const receptionist = await this.receptionistsService.find(dto.receptionistId);
    if (!receptionist) {
      throw new BadRequestException(
        `Receptionist with id "${dto.receptionistId}" does not exist`,
      );
    }

    if (!receptionist.active) {
      throw new BadRequestException(
        `Receptionist with id "${dto.receptionistId}" is not active`,
      );
    }

    const linkedUser = this.usersService.findReceptionistByReceptionistId(dto.receptionistId);
    if (!linkedUser) {
      throw new BadRequestException(
        `Receptionist with id "${dto.receptionistId}" does not belong to a user with the receptionist role`,
      );
    }

    return receptionist.id;
  }

  private assertOwnership(reservation: Reservation, user: User): void {
    if (!isOwner(user.role, reservation.receptionistId, user.receptionistId)) {
      throw new ForbiddenException(
        'You are not allowed to access this reservation: it is not assigned to your user',
      );
    }
  }
}
