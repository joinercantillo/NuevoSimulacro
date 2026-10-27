import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('Authentication')
@ApiSecurity('api-key-auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login to receive JWT token' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.username, loginDto.passwordOrPlana);
  }
}
