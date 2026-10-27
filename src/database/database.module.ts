import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hotel } from '../modules/hotels/entities/hotel.entity.js';
import { Receptionist } from '../modules/receptionists/entities/receptionist.entity.js';
import { Room } from '../modules/rooms/entities/room.entity.js';
import { User } from '../modules/users/entities/user.entity.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Hotel, Room, Receptionist, User])],
  providers: [SeedService],
})
export class DatabaseModule {}
