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

  @Column({ select: false })
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  // AGREGADO AQUÍ: Mapea dinámicamente receptionistId usando el ID del usuario
  get receptionistId(): number {
    return this.id;
  }
}
