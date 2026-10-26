import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin-1', description: 'El nombre de usuario' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: '123456', description: 'La contraseña del usuario' })
  @IsString()
  @IsNotEmpty()
  passwordOrPlana: string; // Puedes llamarlo password o passwordPlana
}
