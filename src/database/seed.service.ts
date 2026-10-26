import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hotel } from '../modules/hotels/entities/hotel.entity.js';
import { Receptionist } from '../modules/receptionists/entities/receptionist.entity.js';
import { RoomStatus } from '../modules/rooms/enums/room-status.enum.js';
import { RoomType } from '../modules/rooms/enums/room-type.enum.js';
import { Room } from '../modules/rooms/entities/room.entity.js';

/**
 * Idempotent seed of the master data (branches, rooms and receptionists).
 * It only inserts when the table is empty, so it never overwrites real data.
 *
 * The ids created here are the ones referenced by the in-memory test users
 * (receptionist-1 -> receptionists.id 1, receptionist-2 -> receptionists.id 2).
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
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedHotels();
    await this.seedRooms();
    await this.seedReceptionists();
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

    this.logger.log('Seed: 2 receptionists created');
  }
}
