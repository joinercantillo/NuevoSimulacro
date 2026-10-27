import { Role } from '../../common/enums/role.enum.js';

/** Contract shared by the service that signs the token and the strategy that verifies it. */
export interface JwtPayload {
  sub: number;
  username: string;
  name: string;
  role: Role;
}

/** Shape that the strategy places in `request.user` after a valid token. */
export interface AuthenticatedUser {
  id: number;
  username: string;
  name: string;
  role: Role;
}
