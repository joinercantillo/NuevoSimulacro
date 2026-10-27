import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mechanichs } from './entities/mechanichs.entity.js';

@Injectable()
export class ReceptionistsService {
  constructor(
    @InjectRepository(Mechanichs)
    private readonly receptionistsRepository: Repository<Mechanichs>,
  ) {}

  findAll(): Promise<Mechanichs[]> {
    return this.receptionistsRepository.find({ order: { id: 'ASC' } });
  }

  /** Returns null when the row does not exist so the caller can answer 400. */
  find(id: number): Promise<Mechanichs | null> {
    return this.receptionistsRepository.findOneBy({ id });
  }
}
