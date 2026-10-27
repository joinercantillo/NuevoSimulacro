import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mechanichs } from './entities/mechanichs.entity.js';
import { ReceptionistsController } from './mechanichs.controller.js';
import { ReceptionistsService } from './mechanichs.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Mechanichs])],
  controllers: [ReceptionistsController],
  providers: [ReceptionistsService],
  exports: [ReceptionistsService],
})
export class ReceptionistsModule {}
