import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/role.enum.js';
import { Hotel } from '../modules/hotels/entities/hotel.entity.js';
import { Receptionist } from '../modules/receptionists/entities/receptionist.entity.js';
import { RoomStatus } from '../modules/rooms/enums/room-status.enum.js';
import { RoomType } from '../modules/rooms/enums/room-type.enum.js';
import { Room } from '../modules/rooms/entities/room.entity.js';
import { User } from '../modules/users/entities/user.entity.js';

/**
 * Idempotent seed of the master data: branches, rooms, receptionists and the
 * four test users. It only inserts when the table is empty, so it never
 * overwrites real data.
 *
 * The ids created here are referenced by other rows and by the documentation:
 *   users.receptionist_id -> receptionists.id (1 and 2)
 * After inserting fixed ids the sequences are advanced, otherwise the next
 * insert made by the API would try to reuse id 1.
 *
 * The initial password of every account comes from SEED_USER_PASSWORD in .env
 * and is stored as a bcrypt hash.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Hotel)
    private readonly hotelsRepository: Repository<Hotel>,
    @InjectRepository(Room)
    private readonly roomsRepository: Repository<Room>,
    @InjectRepository(Receptionist)
    private readonly receptionistsRepository: Repository<Receptionist>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedHotels();
    await this.seedRooms();
    await this.seedReceptionists();
    await this.seedUsers();
  }

  private async seedHotels(): Promise<void> {
    if ((await this.hotelsRepository.count()) > 0) {
      return;
    }

    await this.hotelsRepository.insert([
      {
        id: 1,
        name: 'Arenosa Via 40',
        location: 'Via 40 corridor',
        address: 'Via 40 # 45-21',
        city: 'Barranquilla',
        active: true,
      },
      {
        id: 2,
        name: 'Arenosa Malecon',
        location: 'Rio Riverwalk',
        address: 'Calle 72 # 41-30',
        city: 'Barranquilla',
        active: true,
      },
      {
        id: 3,
        name: 'Arenosa Norte',
        location: 'North city',
        address: 'Carrera 53 # 80-14',
        city: 'Barranquilla',
        active: true,
      },
    ]);

    await this.syncSequence('hotels');
    this.logger.log('Seed: 3 hotel branches created');
  }

  private async seedRooms(): Promise<void> {
    if ((await this.roomsRepository.count()) > 0) {
      return;
    }

    await this.roomsRepository.insert([
      { id: 1, number: '101', roomType: RoomType.SINGLE, capacity: 2, status: RoomStatus.AVAILABLE, hotelId: 1 },
      { id: 2, number: '102', roomType: RoomType.DOUBLE, capacity: 4, status: RoomStatus.AVAILABLE, hotelId: 1 },
      { id: 3, number: '201', roomType: RoomType.SUITE, capacity: 4, status: RoomStatus.AVAILABLE, hotelId: 1 },
      { id: 4, number: '101', roomType: RoomType.DOUBLE, capacity: 4, status: RoomStatus.AVAILABLE, hotelId: 2 },
      { id: 5, number: '202', roomType: RoomType.SUITE, capacity: 6, status: RoomStatus.AVAILABLE, hotelId: 2 },
      { id: 6, number: '301', roomType: RoomType.SINGLE, capacity: 2, status: RoomStatus.AVAILABLE, hotelId: 3 },
    ]);

    await this.syncSequence('rooms');
    this.logger.log('Seed: 6 rooms created');
  }

  private async seedReceptionists(): Promise<void> {
    if ((await this.receptionistsRepository.count()) > 0) {
      return;
    }

    await this.receptionistsRepository.insert([
      {
        id: 1,
        name: 'Maria Rojas',
        document: '12345678',
        phone: '3001234567',
        email: 'maria.rojas@arenosa.example',
        active: true,
      },
      {
        id: 2,
        name: 'Luis Mejia',
        document: '87654321',
        phone: '3007654321',
        email: 'luis.mejia@arenosa.example',
        active: true,
      },
    ]);

    await this.syncSequence('receptionists');
    this.logger.log('Seed: 2 receptionists created');
  }

  private async seedUsers(): Promise<void> {
    if ((await this.usersRepository.count()) > 0) {
      return;
    }

    const passwordHash = await bcrypt.hash(
      this.configService.getOrThrow<string>('seedUserPassword'),
      this.configService.getOrThrow<number>('bcryptRounds'),
    );

    await this.usersRepository.insert([
      {
        id: 1,
        username: 'admin-1',
        name: 'Ana Admin (chain administrator)',
        role: Role.ADMIN,
        receptionistId: null,
        passwordHash,
      },
      {
        id: 2,
        username: 'coordinator-1',
        name: 'Carlos Coordinator (Via 40 branch)',
        role: Role.COORDINATOR,
        receptionistId: null,
        passwordHash,
      },
      {
        id: 3,
        username: 'receptionist-1',
        name: 'Maria Rojas (Via 40 branch)',
        role: Role.RECEPTIONIST,
        receptionistId: 1,
        passwordHash,
      },
      {
        id: 4,
        username: 'receptionist-2',
        name: 'Luis Mejia (Malecon branch)',
        role: Role.RECEPTIONIST,
        receptionistId: 2,
        passwordHash,
      },
    ]);

    await this.syncSequence('users');
    this.logger.log(
      `Seed: 4 users created (initial password from SEED_USER_PASSWORD, bcrypt x${this.configService.getOrThrow<number>('bcryptRounds')})`,
    );
  }

  /**
   * PostgreSQL keeps its own counter for generated ids; after inserting fixed
   * ids it must be moved forward or the next insert would collide.
   */
  private async syncSequence(table: string): Promise<void> {
    await this.hotelsRepository.query(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`,
    );
  }
}
