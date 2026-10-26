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
import { Hotel } from '../../hotels/entities/hotel.entity.js';
import { RoomStatus } from '../enums/room-status.enum.js';
import { RoomType } from '../enums/room-type.enum.js';

/** Rooms available in each branch. */
@Entity('rooms')
export class Room {
  @ApiProperty({ example: 1, description: 'Auto generated identifier' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: '101', description: 'Room number' })
  @Column({ type: 'varchar', length: 10 })
  number: string;

  @ApiProperty({ example: 'DOUBLE', description: 'Room type', enum: RoomType })
  @Column({ name: 'room_type', type: 'varchar', length: 20 })
  roomType: RoomType;

  @ApiProperty({ example: 4, description: 'Maximum number of guests' })
  @Column({ type: 'int' })
  capacity: number;

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

  @ManyToOne(() => Hotel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'hotel_id' })
  hotel: Hotel;
}
