import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity.js';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomsRepository: Repository<Room>,
  ) {}

  findAll(): Promise<Room[]> {
    return this.roomsRepository.find({ relations: { hotel: true }, order: { id: 'ASC' } });
  }

  /** Returns null when the room does not exist so the caller can answer 400. */
  find(id: number): Promise<Room | null> {
    return this.roomsRepository.findOneBy({ id });
  }
}
