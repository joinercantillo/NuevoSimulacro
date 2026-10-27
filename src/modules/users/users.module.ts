import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceptionistsModule } from '../receptionists/receptionists.module.js';
import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { USER_DIRECTORY } from './user-directory.interface.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ReceptionistsModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    // Same instance behind the contract used by the guards and the use cases.
    { provide: USER_DIRECTORY, useExisting: UsersService },
  ],
  exports: [UsersService, USER_DIRECTORY],
})
export class UsersModule {}
