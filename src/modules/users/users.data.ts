import { Role } from '../../common/enums/role.enum.js';
import { User } from './user.js';

/**
 * Test users defined in memory. There is no user entity on purpose:
 * the assignment does not require a login system.
 *
 * The `receptionistId` values match the rows created by the database seed
 * (see src/database/seed.service.ts).
 */
export const TEST_USERS: User[] = [
  { id: 'admin-1', name: 'Ana Admin (chain administrator)', role: Role.ADMIN },
  { id: 'coordinator-1', name: 'Carlos Coordinator (Vía 40 branch)', role: Role.COORDINATOR },
  {
    id: 'receptionist-1',
    name: 'María Rojas (Vía 40 branch)',
    role: Role.RECEPTIONIST,
    receptionistId: 1,
  },
  {
    id: 'receptionist-2',
    name: 'Luis Mejía (Malecón branch)',
    role: Role.RECEPTIONIST,
    receptionistId: 2,
  },
];
