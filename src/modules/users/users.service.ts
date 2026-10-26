import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const exists = await this.usersRepository.findOneBy({ username: createUserDto.username });
    if (exists) {
      throw new BadRequestException('Username is already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(createUserDto.passwordPlana, salt);

    // CORREGIDO AQUÍ: usersRepository (en inglés) para que coincida con el constructor
    const newUser = this.usersRepository.create({
      username: createUserDto.username,
      name: createUserDto.name,
      role: createUserDto.role,
      passwordHash: hash,
    });

    return this.usersRepository.save(newUser);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
    // Busca un usuario por su ID (usado por el guardián de usuarios)
  async findById(id: any): Promise<User | undefined> {
    // Si el ID viene como string del x-user antiguo, intentamos convertirlo o buscarlo directamente
    const numericId = isNaN(Number(id)) ? 0 : Number(id);
    const user = await this.usersRepository.findOneBy({ id: numericId });
    return user || undefined;
  }

  // Busca una recepcionista por su ID de usuario (usado por reservaciones)
  async findReceptionistByReceptionistId(receptionistId: any): Promise<User | undefined> {
    const numericId = isNaN(Number(receptionistId)) ? 0 : Number(receptionistId);
    const user = await this.usersRepository.findOneBy({ 
      id: numericId,
      role: 'recepcionista' 
    });
    return user || undefined;
  }

}
