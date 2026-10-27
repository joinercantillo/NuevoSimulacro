import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../../common/enums/role.enum.js';

/**
 * Users of the API.
 *
 * The identity travels in the `x-user` header and is looked up here: the role
 * always comes from this table, never from the request.
 *
 * Receptionist users keep the foreign key to the `receptionists` table so a
 * reservation can be assigned to them. The password is stored as a bcrypt
 * hash and is never selected unless the login explicitly asks for it.
 */
@Entity('users')
export class User {
  @ApiProperty({ example: 'admin-1', description: 'Value sent in the x-user header' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'receptionist-1', description: 'Unique login name' })
  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @ApiProperty({ example: 'Maria Rojas (Via 40 branch)', description: 'Display name' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({ enum: Role, example: Role.ADMIN, description: 'Permissions of the user' })
  @Column({ type: 'varchar', length: 20 })
  role: Role;

  @ApiPropertyOptional({
    example: 1,
    description: 'Row in the receptionists table. Only for users with the receptionist role.',
  })
  @Column({ name: 'receptionist_id', type: 'int', nullable: true })
  receptionistId: number | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
