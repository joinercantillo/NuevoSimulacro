import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receptionist } from './entities/receptionist.entity.js';

@Injectable()
export class ReceptionistsService {
  constructor(
    @InjectRepository(Receptionist)
    private readonly receptionistsRepository: Repository<Receptionist>,
  ) {}

  findAll(): Promise<Receptionist[]> {
    return this.receptionistsRepository.find({ order: { id: 'ASC' } });
  }

  /** Returns null when the row does not exist so the caller can answer 400. */
  find(id: number): Promise<Receptionist | null> {
    return this.receptionistsRepository.findOneBy({ id });
  }
}
