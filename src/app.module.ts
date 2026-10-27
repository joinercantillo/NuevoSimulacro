import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { ApiKeyGuard } from './common/guards/api-key.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { UserGuard } from './common/guards/user.guard.js';
import { DatabaseModule } from './database/database.module.js';
import { EnvConfig } from './config/env.config.js';
import { envValidationSchema } from './config/env.validation.schema.js';
import { HotelsModule } from './modules/hotels/hotels.module.js';
import { ReceptionistsModule } from './modules/receptionists/receptionists.module.js';
import { ReservationsModule } from './modules/reservations/reservations.module.js';
import { RoomsModule } from './modules/rooms/rooms.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [EnvConfig],
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const database = configService.get<DataSourceOptions>('database');
        if (!database) {
          throw new Error('Missing database configuration, check the .env file');
        }
        return database;
      },
    }),
    DatabaseModule,
    UsersModule,
    HotelsModule,
    RoomsModule,
    ReceptionistsModule,
    ReservationsModule,
    AuthModule,
    
  ],
  providers: [
    // Order matters: API key first, identity second, roles last.
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: UserGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
