import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceptionistsModule } from '../receptionists/receptionists.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { UsersModule } from '../users/users.module.js';
import { Reservation } from './entities/reservation.entity.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation]),
    UsersModule,
    ReceptionistsModule,
    RoomsModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
