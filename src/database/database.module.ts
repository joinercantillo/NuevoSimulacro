import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workshop } from '../modules/workshops/entities/workshop.entity.js';
import { Mechanichs } from '../modules/mechanics/entities/mechanichs.entity.js';
import { Car } from '../modules/cars/entities/car.entity.js';
import { User } from '../modules/users/entities/user.entity.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Workshop, Car, Mechanichs, User])],
  providers: [SeedService],
})
export class DatabaseModule {}
