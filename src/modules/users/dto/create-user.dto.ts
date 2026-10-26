import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'ana-1' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Ana Admin' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'admin', description: 'admin, coordinador, or recepcionista' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  passwordPlana: string;
}
