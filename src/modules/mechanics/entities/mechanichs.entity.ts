import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Receptionists of the chain; reservations point to them through receptionist_id. */
@Entity('mechanichs')
export class Mechanichs {
  @ApiProperty({ example: 1, description: 'Auto generated identifier' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Maria Rojas', description: 'Mechanich full name' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({ example: '12345678', description: 'National id document' })
  @Column({ type: 'varchar', length: 20 })
  document: string;

  @ApiProperty({ example: '3001234567', description: 'Phone number' })
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @ApiProperty({ example: 'maria.rojas@arenosa.example', description: 'Email address' })
  @Column({ type: 'varchar', length: 100 })
  email: string;

  @ApiProperty({ example: true, description: 'Whether the mechanich is active' })
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * The reservations are not declared here on purpose: `Reservation` already
   * holds the receptionist_id foreign key and defining both sides would create
   * a circular import between the two entity files.
   */
}
