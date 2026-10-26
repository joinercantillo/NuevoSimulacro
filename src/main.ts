import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { swaggerConfiguration } from './config/swagger.config.js';

async function bootstrap() {
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

  swaggerConfiguration(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3000;

  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger on http://localhost:${port}/api/docs`, 'Bootstrap');
}
await bootstrap();
