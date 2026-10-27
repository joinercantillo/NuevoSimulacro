import { DataSourceOptions } from 'typeorm';

/**
 * Reads the environment variables defined in .env.
 *
 * No value is hardcoded: a missing variable stops the application with an
 * explicit message instead of falling back to a hidden default.
 */
const required = (name: string): string => {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing environment variable "${name}". Copy .env.example to .env and complete it.`,
    );
  }

  return value.trim();
};

const commaList = (name: string): string[] =>
  required(name)
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

/** Registered in ConfigModule and consumed through ConfigService. */
export const EnvConfig = () => ({
  host: required('HOST'),
  port: Number(required('PORT')),

  // Several keys at once (one per hotel branch).
  apiKeys: commaList('API_KEYS'),

  // JWT signing settings (POST /auth/login and GET /auth/profile).
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: required('JWT_EXPIRES_IN'),

  // Password hashing and the credentials of the accounts created by the seed.
  bcryptRounds: Number(required('BCRYPT_ROUNDS')),
  seedUserPassword: required('SEED_USER_PASSWORD'),

  database: {
    type: 'postgres',
    host: required('DB_HOST'),
    port: Number(required('DB_PORT')),
    database: required('DB_NAME'),
    username: required('DB_USER'),
    password: required('DB_PASSWORD'),
    autoLoadEntities: true,
    synchronize: required('DB_SYNCHRONIZE') === 'true',
  } as DataSourceOptions,
});
