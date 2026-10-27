import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Car } from './entities/car.entity.js';
import { RoomsController } from './cars.controller.js';
import { RoomsService } from './cars.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Car])],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
