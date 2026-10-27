import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum.js';

/**
 * DTO of POST /users.
 *
 * The password travels in clear inside the transport (HTTPS in production) and
 * is hashed with bcrypt before being stored; it is never returned.
 */
export class CreateUserDto {
  @ApiProperty({ example: 'receptionist-3', description: 'Unique login name' })
  @IsString({ message: 'username must be a string' })
  @IsNotEmpty({ message: 'username is required' })
  @MaxLength(50, { message: 'username cannot exceed 50 characters' })
  @Matches(/^\S+$/, { message: 'username cannot contain spaces' })
  username: string;

  @ApiProperty({ example: 'Maria Rojas (Via 40 branch)', description: 'Display name' })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(100, { message: 'name cannot exceed 100 characters' })
  name: string;

  @ApiProperty({ enum: Role, example: Role.TECHNICIAN, description: 'Permissions of the user' })
  @IsEnum(Role, { message: 'role must be admin, coordinator or receptionist' })
  role: Role;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Mandatory when role is receptionist: the row in the receptionists table linked to this user.',
  })
  @IsOptional()
  @IsInt({ message: 'receptionistId must be an integer' })
  @Min(1, { message: 'receptionistId must be greater than zero' })
  receptionistId?: number;

  @ApiProperty({ example: 'SecurePass123', minLength: 6, description: 'Plain password' })
  @IsString({ message: 'password must be a string' })
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  password: string;
}
