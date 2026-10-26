import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Branches of the Arenosa Hotels chain (Via 40, Rio Riverwalk and North city). */
@Entity('hotels')
export class Hotel {
  @ApiProperty({ example: 1, description: 'Auto generated identifier' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Arenosa Via 40', description: 'Branch name' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({ example: 'Via 40 corridor', description: 'Area of the city' })
  @Column({ type: 'varchar', length: 100 })
  location: string;

  @ApiProperty({ example: 'Via 40 # 45-21', description: 'Street address' })
  @Column({ type: 'varchar', length: 200 })
  address: string;

  @ApiProperty({ example: 'Barranquilla', description: 'City' })
  @Column({ type: 'varchar', length: 100 })
  city: string;

  @ApiProperty({ example: true, description: 'Whether the branch is still operating' })
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * The rooms are not declared here on purpose: `Room` already holds the
   * hotel_id foreign key and defining both sides would create a circular
   * import between the two entity files.
   */
}
