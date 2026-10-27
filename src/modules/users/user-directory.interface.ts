import { User } from './entities/user.entity.js';

/** Injection token: the consumers depend on this contract, not on the concrete service. */
export const USER_DIRECTORY = 'USER_DIRECTORY';

/**
 * Narrow contract consumed by the authentication guard and by the reservation
 * use cases (Interface Segregation): it exposes exactly the lookups the rest
 * of the application needs and hides the user administration.
 */
export interface UserDirectory {
  findByUsername(username: string | undefined): Promise<User | undefined>;
  findReceptionistByReceptionistId(receptionistId: number): Promise<User | undefined>;
}
