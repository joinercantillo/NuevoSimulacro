import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workshop } from './entities/workshop.entity.js';
import { HotelsController } from './workshops.controller.js';
import { HotelsService } from './workshops.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Workshop])],
  controllers: [HotelsController],
  providers: [HotelsService],
  exports: [HotelsService],
})
export class HotelsModule {}
