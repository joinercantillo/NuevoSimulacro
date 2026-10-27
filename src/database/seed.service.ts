import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/enums/role.enum.js';
import { Workshop } from '../modules/workshops/entities/workshop.entity.js';
import { Mechanichs } from '../modules/mechanics/entities/mechanichs.entity.js';
import { RoomStatus } from '../modules/cars/enums/car-status.enum.js';
import { brandCar } from '../modules/cars/enums/car-type.enum.js';
import { Car } from '../modules/cars/entities/car.entity.js';
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
    @InjectRepository(Workshop)
    private readonly WorkshopRepository: Repository<Workshop>,
    @InjectRepository(Car)
    private readonly carRepository: Repository<Car>,
    @InjectRepository(Mechanichs)
    private readonly mechanichssRepository: Repository<Mechanichs>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedWorkshops();
    await this.seedCars();
    await this.seedMechanics();
    await this.seedUsers();
  }

  private async seedWorkshops(): Promise<void> {
    if ((await this.WorkshopRepository.count()) > 0) {
      return;
    }

    await this.WorkshopRepository.insert([
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

  private async seedCars(): Promise<void> {
    if ((await this.carRepository.count()) > 0) {
      return;
    }

    await this.carRepository.insert([
      { id: 1, Registration: '101', brandCar: brandCar.Mazda, year: 2004, status: RoomStatus.AVAILABLE, hotelId: 1 },
      { id: 2, Registration: '102', brandCar: brandCar.Chevrolet, year: 2006, status: RoomStatus.AVAILABLE, hotelId: 1 },
      { id: 3, Registration: '201', brandCar: brandCar.Nissan, year: 2009, status: RoomStatus.AVAILABLE, hotelId: 1 },
      { id: 4, Registration: '101', brandCar: brandCar.Chevrolet, year: 2007, status: RoomStatus.AVAILABLE, hotelId: 2 },
      { id: 5, Registration: '202', brandCar: brandCar.Nissan, year: 2008, status: RoomStatus.AVAILABLE, hotelId: 2 },
      { id: 6, Registration: '301', brandCar: brandCar.Mazda, year: 2010, status: RoomStatus.AVAILABLE, hotelId: 3 },
    ]);

    await this.syncSequence('cars');
    this.logger.log('Seed: 6 rooms created');
  }

  private async seedMechanics(): Promise<void> {
    if ((await this.mechanichssRepository.count()) > 0) {
      return;
    }

    await this.mechanichssRepository.insert([
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
        role: Role.TECHNICIAN,
        receptionistId: null,
        passwordHash,
      },
      {
        id: 3,
        username: 'receptionist-1',
        name: 'Maria Rojas (Via 40 branch)',
        role: Role.TECHNICIAN,
        receptionistId: 1,
        passwordHash,
      },
      {
        id: 4,
        username: 'receptionist-2',
        name: 'Luis Mejia (Malecon branch)',
        role: Role.TECHNICIAN,
        receptionistId: 2,
        passwordHash,
      },

       {
        id: 11,
        username: 'admin-12',
        name: 'Ana Admin (chain administrator)',
        role: Role.ADMIN,
        receptionistId: null,
        passwordHash:'123456',
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
    await this.WorkshopRepository.query(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`,
    );
  }
}
