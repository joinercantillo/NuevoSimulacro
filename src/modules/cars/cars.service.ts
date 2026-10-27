import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Car } from './entities/car.entity.js';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Car)
    private readonly roomsRepository: Repository<Car>,
  ) {}

  findAll(): Promise<Car[]> {
    return this.roomsRepository.find({ relations: { hotel: true }, order: { id: 'ASC' } });
  }

  /** Returns null when the room does not exist so the caller can answer 400. */
  find(id: number): Promise<Car | null> {
    return this.roomsRepository.findOneBy({ id });
  }
}
