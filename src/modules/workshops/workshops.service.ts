import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workshop } from './entities/workshop.entity.js';

@Injectable()
export class HotelsService {
  constructor(
    @InjectRepository(Workshop)
    private readonly hotelsRepository: Repository<Workshop>,
  ) {}

  findAll(): Promise<Workshop[]> {
    return this.hotelsRepository.find({ order: { id: 'ASC' } });
  }
}
