import { Role } from '../../common/enums/role.enum.js';

/**
 * Test user. Identity travels in the x-user header and the role is always
 * resolved server-side, never taken from the request body.
 *
 * Receptionist users carry the `receptionistId` foreign key that points to the
 * `receptionists` table (the users themselves are kept in memory on purpose).
 */
export interface User {
  id: string;
  name: string;
  role: Role;
  /** Only for receptionist users: their row in the `receptionists` table. */
  receptionistId?: number;
}
