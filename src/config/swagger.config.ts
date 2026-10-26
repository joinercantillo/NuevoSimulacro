import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const logger = new Logger('Swagger');

export const swaggerConfiguration = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('Arenosa Hotels S.A.S. - Reservations API')
    .setDescription(
      'REST API to register and control hotel room reservations for the Barranquilla Carnival season. ' +
        'Every endpoint requires the `x-api-key` header (a valid key configured in the environment) and the ' +
        '`x-user` header (the id of a test user). Use the Authorize button to send both headers.',
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
        name: 'x-api-key', // Nombre exacto de la cabecera que busca el error
        in: 'header',
        description: 'Ingresa tu API Key global para poder consumir los recursos',
      },
      'api-key-auth', // Nombre de la estrategia para los controladores
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  logger.log(`Docs available at http://localhost:${process.env.PORT ?? 3000}/api/docs`);
};
