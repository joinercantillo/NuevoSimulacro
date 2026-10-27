import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum.js';

/**
 * DTO of PATCH /users/:id.
 *
 * `username` is not editable on purpose: it is the identity used by the
 * x-user header and changing it would break the audit of existing sessions.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Ana Admin (chain administrator)' })
  @IsOptional()
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name cannot be empty' })
  @MaxLength(100, { message: 'name cannot exceed 100 characters' })
  name?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.COORDINATOR })
  @IsOptional()
  @IsEnum(Role, { message: 'role must be admin, coordinator or receptionist' })
  role?: Role;

  @ApiPropertyOptional({ example: 2, description: 'Row in the receptionists table' })
  @IsOptional()
  @IsInt({ message: 'receptionistId must be an integer' })
  @Min(1, { message: 'receptionistId must be greater than zero' })
  receptionistId?: number;

  @ApiPropertyOptional({ example: 'SecurePass123', minLength: 6, description: 'New plain password' })
  @IsOptional()
  @IsString({ message: 'password must be a string' })
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  password?: string;
}
