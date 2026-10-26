import { Injectable } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';
import { TEST_USERS } from './users.data.js';
import { User } from './user.js';

/** Single source of truth for the identity and role of a caller. */
@Injectable()
export class UsersService {
  private readonly users: User[] = TEST_USERS;

  findById(id: string | undefined): User | undefined {
    if (!id) {
      return undefined;
    }
    return this.users.find((user) => user.id === id);
  }

  /** Used to check that a receptionistId belongs to a receptionist-role user. */
  findReceptionistByReceptionistId(receptionistId: number): User | undefined {
    return this.users.find(
      (user) => user.role === Role.RECEPTIONIST && user.receptionistId === receptionistId,
    );
  }

  list(): User[] {
    return [...this.users];
  }
}
