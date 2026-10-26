import { DataSourceOptions } from 'typeorm';

/**
 * Reads and interprets the environment variables.
 * The result is registered in ConfigModule and consumed through ConfigService.
 */
export const EnvConfig = () => ({
  port: Number(process.env.PORT ?? 3000),

  // Several keys at once (one per hotel branch). Accidental spaces are trimmed.
  apiKeys: (process.env.API_KEYS ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0),

  database: {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    autoLoadEntities: true,
    synchronize: process.env.DB_SYNCHRONIZE !== 'false',
  } as DataSourceOptions,
});
