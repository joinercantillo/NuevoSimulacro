import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum.js';

/** Public representation of a user: the password hash is never documented. */
export class UserResponseDto {
  @ApiProperty({ example: 3, description: 'Auto generated identifier' })
  id: number;

  @ApiProperty({ example: 'receptionist-1', description: 'Value sent in the x-user header' })
  username: string;

  @ApiProperty({ example: 'Maria Rojas (Via 40 branch)', description: 'Display name' })
  name: string;

  @ApiProperty({ enum: Role, example: Role.TECHNICIAN, description: 'Permissions of the user' })
  role: Role;

  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'Row in the receptionists table (null for admin and coordinator)',
  })
  receptionistId: number | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}
