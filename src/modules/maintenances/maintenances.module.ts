import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceptionistsModule } from '../mechanics/mechanichs.module.js';
import { RoomsModule } from '../cars/cars.module.js';
import { UsersModule } from '../users/users.module.js';
import { Reservation } from './entities/maintenances.entity.js';
import { ReservationsController } from './maintenances.controller.js';
import { ReservationsService } from './maintenances.service.js';

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
