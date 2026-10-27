import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { swaggerConfiguration } from './config/swagger.config.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global DTO validation: unknown or protected fields are rejected.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // The port is not read from process.env here: it comes from the validated
  // configuration registered in ConfigModule (.env).
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('port');
  const host = configService.getOrThrow<string>('host');

  swaggerConfiguration(app, host, port);

  await app.listen(port, host);
  Logger.log(`API listening on http://${host}:${port}`, 'Bootstrap');
  Logger.log(`Swagger on http://${host}:${port}/api/docs`, 'Bootstrap');
}

await bootstrap();
