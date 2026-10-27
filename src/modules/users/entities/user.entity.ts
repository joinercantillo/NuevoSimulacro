import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  name: string;

  @Column()
  role: string; // 'admin', 'coordinador', 'recepcionista'

  @Column({ select: false }) // Oculta el hash por defecto en consultas select globales
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  get receptionistId(): number {
    return this.id;
  }
}
