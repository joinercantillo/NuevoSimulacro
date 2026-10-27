import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import type { AuthenticatedUser } from './jwt-payload.interface.js';

@ApiTags('Authentication')
@ApiSecurity('API Key')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange credentials for a JWT',
    description:
      'Only the API key is required here: the token is the result of a successful login. The ' +
      'password is compared against the bcrypt hash stored in PostgreSQL.',
  })
  @ApiOkResponse({
    description: 'Access token',
    schema: {
      example: {
        success: true,
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiJ9...',
          token_type: 'Bearer',
          expires_in: '1h',
          user: { id: 1, username: 'admin-1', name: 'Ana Admin', role: 'admin' },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Wrong username or password' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid DTO' })
  login(@Body() loginDto: LoginDto): ReturnType<AuthService['login']> {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Public()
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User behind the current token',
    description:
      'Validates the Authorization header with the JWT strategy (passport) and returns the ' +
      'identity contained in the token. The API key is still required.',
  })
  @ApiOkResponse({
    description: 'Identity recovered from the token',
    schema: {
      example: {
        success: true,
        data: { id: 1, username: 'admin-1', name: 'Ana Admin', role: 'admin' },
      },
    },
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Missing, expired or invalid token' })
  getProfile(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
