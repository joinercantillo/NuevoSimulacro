import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { Role } from '../../common/enums/role.enum.js';
import { ParsePositiveIdPipe } from '../../common/pipes/positive-id.pipe.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { PublicUser, UsersService } from './users.service.js';

/**
 * User administration. Every endpoint is restricted to the admin role, so a
 * regular user cannot create accounts or change permissions.
 */
@ApiTags('Users')
@ApiSecurity('API Key')
@ApiSecurity('User')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a user (admin only)',
    description:
      'The password is hashed with bcrypt before being stored. A user with the receptionist ' +
      'role must reference an active row of the receptionists table through receptionistId.',
  })
  @ApiCreatedResponse({ type: UserResponseDto, description: 'User created' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid DTO, duplicated username or invalid receptionist link',
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Invalid identity' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Only admin can manage users' })
  create(@Body() createUserDto: CreateUserDto): Promise<PublicUser> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List the users of the API (admin only)' })
  @ApiOkResponse({ type: [UserResponseDto], description: 'User list' })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Invalid identity' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Only admin can manage users' })
  findAll(): Promise<PublicUser[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get one user (admin only)' })
  @ApiParam({ name: 'id', description: 'User id', example: 3 })
  @ApiOkResponse({ type: UserResponseDto, description: 'User detail' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'The id is not a positive number' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'User does not exist' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Only admin can manage users' })
  findOne(@Param('id', ParsePositiveIdPipe) id: number): Promise<PublicUser> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update a user (admin only)',
    description: 'username is immutable: it is the identity used by the x-user header.',
  })
  @ApiParam({ name: 'id', description: 'User id', example: 3 })
  @ApiOkResponse({ type: UserResponseDto, description: 'User updated' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid DTO or receptionist link' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'User does not exist' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Only admin can manage users' })
  update(
    @Param('id', ParsePositiveIdPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<PublicUser> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  @ApiParam({ name: 'id', description: 'User id', example: 3 })
  @ApiOkResponse({ type: UserResponseDto, description: 'User deleted' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'The id is not a positive number' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'User does not exist' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Only admin can manage users' })
  remove(@Param('id', ParsePositiveIdPipe) id: number): Promise<PublicUser> {
    return this.usersService.remove(id);
  }
}
