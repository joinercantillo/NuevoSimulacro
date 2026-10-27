import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Workshop } from '../../workshops/entities/workshop.entity.js';
import { RoomStatus } from '../enums/car-status.enum.js';
import { brandCar } from '../enums/car-type.enum.js';

/** Rooms available in each branch. */
@Entity('cars')
export class Car {
  @ApiProperty({ example: 1, description: 'Auto generated identifier' })
  @PrimaryGeneratedColumn()
  id: number;


  @ApiProperty({ example: '101', description: 'Vehicle registration' })
  @Column({ type: 'varchar', length: 10 })
  Registration: string;

  @ApiProperty({ example: 'DOUBLE', description: 'BrandCar', enum: brandCar })
  @Column({ name: 'room_type', type: 'varchar', length: 20 })
  brandCar: brandCar;

  @ApiProperty({ example: 4, description: 'MODEL CAR' })
  @Column({ type: 'int' })
  year: number;
  

  @ApiProperty({ example: 'AVAILABLE', description: 'Operational status', enum: RoomStatus })
  @Column({ type: 'varchar', length: 20, default: RoomStatus.AVAILABLE })
  status: RoomStatus;

  @ApiProperty({ example: 1, description: 'Branch the room belongs to' })
  @Column({ name: 'hotel_id' })
  hotelId: number;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Workshop, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'hotel_id' })
  hotel: Workshop;
}
