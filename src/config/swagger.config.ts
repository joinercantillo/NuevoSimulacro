import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const logger = new Logger('Swagger');

export const swaggerConfiguration = (app: INestApplication, host: string, port: number): void => {
  const config = new DocumentBuilder()
    .setTitle('Arenosa Hotels S.A.S. - Reservations API')
    .setDescription(
      'REST API to register and control hotel room reservations for the Barranquilla Carnival season. ' +
        'Every endpoint requires the `x-api-key` header (a valid key configured in .env) and the ' +
        '`x-user` header (the username of a user that exists in PostgreSQL, for example admin-1). ' +
        'POST /auth/login additionally issues a JWT that can be used in `GET /auth/profile`. ' +
        'Use the Authorize button to send the credentials.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key', // Exact header read by ApiKeyGuard
        in: 'header',
        description: 'API key configured in the API_KEYS variable of .env',
      },
      'api-key-auth', // Strategy name used by the guards
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  logger.log(`Docs available at http://${host}:${port}/api/docs`);
};
