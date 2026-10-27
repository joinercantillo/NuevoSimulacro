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
import { Mechanichs } from '../../mechanics/entities/mechanichs.entity.js';
import { Car } from '../../cars/entities/car.entity.js';
import { ReservationStatus } from '../enums/maintenance-status.enum.js';
import { brandCar } from '../../cars/enums/car-type.enum.js';

/**
 * Reservations of the chain. `id`, `status`, `createdAt` and `updatedAt` are
 * managed by the system and are never accepted from the client.
 */
@Entity('reservations')
export class Reservation {
  @ApiProperty({ example: 1, description: 'Auto generated identifier' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Juan Perez', description: 'Full name of the guest' })
  @Column({ type: 'varchar', length: 100 })
  guest: string;

  @ApiProperty({
    example: '12345678',
    description: 'Guest document: digits only, between 6 and 12 characters',
  })
  @Column({ name: 'guest_document', type: 'varchar', length: 12 })
  guestDocument: string;

  @ApiProperty({ example: 'SUITE', description: 'Booked room type', enum: brandCar })
  @Column({ name: 'room_type', type: 'varchar', length: 20 })
  roomType: brandCar;

  @ApiProperty({ example: '2027-02-13', description: 'Arrival date (ISO 8601)' })
  @Column({ name: 'check_in', type: 'date' })
  checkInDate: string;

  @ApiProperty({ example: '2027-02-17', description: 'Departure date (ISO 8601)' })
  @Column({ name: 'check_out', type: 'date' })
  checkOutDate: string;

  @ApiProperty({ example: 1, description: 'Receptionist responsible for the reservation' })
  @Column({ name: 'receptionist_id' })
  receptionistId: number;

  @ApiProperty({ example: 3, description: 'Room assigned to the reservation' })
  @Column({ name: 'room_id' })
  roomId: number;

  @ApiProperty({ example: 'PENDING', description: 'Current status', enum: ReservationStatus })
  @Column({ type: 'varchar', length: 20, default: ReservationStatus.SCHEDULED })
  status: ReservationStatus;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Mechanichs, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'receptionist_id' })
  mechanichs: Mechanichs;

  @ManyToOne(() => Car, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_id' })
  room: Car;
}
