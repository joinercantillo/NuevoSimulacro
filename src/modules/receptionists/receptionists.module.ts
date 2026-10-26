import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receptionist } from './entities/receptionist.entity.js';
import { ReceptionistsController } from './receptionists.controller.js';
import { ReceptionistsService } from './receptionists.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Receptionist])],
  controllers: [ReceptionistsController],
  providers: [ReceptionistsService],
  exports: [ReceptionistsService],
})
export class ReceptionistsModule {}
