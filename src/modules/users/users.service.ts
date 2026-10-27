import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum.js';
import { ReceptionistsService } from '../receptionists/receptionists.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';
import { UserDirectory } from './user-directory.interface.js';

/** Shape returned to the clients: the hash never leaves the service. */
export type PublicUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService implements UserDirectory {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly receptionistsService: ReceptionistsService,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<PublicUser> {
    const exists = await this.usersRepository.findOneBy({ username: createUserDto.username });
    if (exists) {
      throw new BadRequestException(`Username "${createUserDto.username}" is already registered`);
    }

    // `null` in the payload means "without link": it is normalised to absent
    // before the business validation so both cases behave the same way.
    const receptionistId = createUserDto.receptionistId ?? undefined;

    await this.assertReceptionistLink(createUserDto.role, receptionistId);

    const user = this.usersRepository.create({
      username: createUserDto.username,
      name: createUserDto.name,
      role: createUserDto.role,
      receptionistId: receptionistId ?? null,
      passwordHash: await this.hash(createUserDto.password),
    });

    return this.toPublic(await this.usersRepository.save(user));
  }

  async findAll(): Promise<PublicUser[]> {
    const users = await this.usersRepository.find({ order: { id: 'ASC' } });
    return users.map((user) => this.toPublic(user));
  }

  async findOne(id: number): Promise<PublicUser> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" does not exist`);
    }
    return this.toPublic(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" does not exist`);
    }

    const nextRole = updateUserDto.role ?? user.role;
    const nextReceptionistId =
      updateUserDto.receptionistId !== undefined
        ? updateUserDto.receptionistId
        : updateUserDto.role !== undefined && updateUserDto.role !== Role.RECEPTIONIST
          ? null
          : user.receptionistId;

    await this.assertReceptionistLink(nextRole, nextReceptionistId ?? undefined);

    user.name = updateUserDto.name ?? user.name;
    user.role = nextRole;
    user.receptionistId = nextReceptionistId;

    if (updateUserDto.password) {
      user.passwordHash = await this.hash(updateUserDto.password);
    }

    return this.toPublic(await this.usersRepository.save(user));
  }

  async remove(id: number): Promise<PublicUser> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" does not exist`);
    }
    return this.toPublic(await this.usersRepository.remove(user));
  }

  /** Used by UserGuard: identity travels in the x-user header. */
  async findByUsername(username: string | undefined): Promise<User | undefined> {
    if (!username) {
      return undefined;
    }
    const user = await this.usersRepository.findOneBy({ username });
    return user ?? undefined;
  }

  /** Used by AuthService: the hash is selected only for the login. */
  async findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        receptionistId: true,
        passwordHash: true,
      },
    });
  }

  /**
   * Used when an admin or a coordinator registers a reservation for somebody
   * else: the referenced row must belong to a receptionist role user.
   */
  async findReceptionistByReceptionistId(
    receptionistId: number,
  ): Promise<User | undefined> {
    const user = await this.usersRepository.findOneBy({
      receptionistId,
      role: Role.RECEPTIONIST,
    });
    return user ?? undefined;
  }

  /** A receptionist user always points to a row of the receptionists table. */
  private async assertReceptionistLink(
    role: Role,
    receptionistId: number | undefined,
  ): Promise<void> {
    if (role !== Role.RECEPTIONIST) {
      if (receptionistId !== undefined) {
        throw new BadRequestException(
          'receptionistId is only valid when the role is "receptionist"',
        );
      }
      return;
    }

    if (receptionistId === undefined) {
      throw new BadRequestException(
        'receptionistId is required when the role is "receptionist"',
      );
    }

    const receptionist = await this.receptionistsService.find(receptionistId);
    if (!receptionist) {
      throw new BadRequestException(`Receptionist with id "${receptionistId}" does not exist`);
    }
    if (!receptionist.active) {
      throw new BadRequestException(`Receptionist with id "${receptionistId}" is not active`);
    }
  }

  private async hash(password: string): Promise<string> {
    const rounds = this.configService.getOrThrow<number>('bcryptRounds');
    return bcrypt.hash(password, rounds);
  }

  /** Removes the hash before the user leaves the service. */
  private toPublic(user: User): PublicUser {
    const copy: Partial<User> = { ...user };
    delete copy.passwordHash;
    return copy as PublicUser;
  }
}
