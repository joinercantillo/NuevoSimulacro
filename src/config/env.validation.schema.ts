import * as z from 'zod';

/**
 * Validation of the environment file.
 *
 * There are no default values on purpose: every variable must be defined in
 * .env (copy .env.example to .env) or the application refuses to start.
 */
export const envValidationSchema = z.object({
  HOST: z.string({ message: 'HOST is mandatory, define it in .env' }).min(
    1,
    'HOST cannot be empty',
  ),
  PORT: z.coerce
    .number({ message: 'PORT is mandatory and must be a number' })
    .int('PORT must be an integer')
    .min(1, 'PORT must be between 1 and 65535')
    .max(65535, 'PORT must be between 1 and 65535'),

  DB_HOST: z.string({ message: 'DB_HOST is mandatory, define it in .env' }).min(
    1,
    'DB_HOST cannot be empty',
  ),
  DB_PORT: z.coerce
    .number({ message: 'DB_PORT is mandatory and must be a number' })
    .int('DB_PORT must be an integer')
    .min(1, 'DB_PORT must be between 1 and 65535')
    .max(65535, 'DB_PORT must be between 1 and 65535'),
  DB_NAME: z.string({ message: 'DB_NAME is mandatory, define it in .env' }).min(
    1,
    'DB_NAME cannot be empty',
  ),
  DB_USER: z.string({ message: 'DB_USER is mandatory, define it in .env' }).min(
    1,
    'DB_USER cannot be empty',
  ),
  DB_PASSWORD: z
    .string({ message: 'DB_PASSWORD is mandatory, define it in .env' })
    .min(1, 'DB_PASSWORD cannot be empty'),
  DB_SYNCHRONIZE: z
    .enum(['true', 'false'], {
      message: 'DB_SYNCHRONIZE must be "true" or "false"',
    })
    .transform((value) => value === 'true'),

  API_KEYS: z
    .string({ message: 'API_KEYS is mandatory, define it in .env' })
    .refine(
      (value) =>
        value
          .split(',')
          .map((key) => key.trim())
          .filter((key) => key.length > 0).length > 0,
      'API_KEYS must contain at least one key separated by commas',
    ),

  JWT_SECRET: z
    .string({ message: 'JWT_SECRET is mandatory, define it in .env' })
    .min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z
    .string({ message: 'JWT_EXPIRES_IN is mandatory, define it in .env' })
    .min(1, 'JWT_EXPIRES_IN cannot be empty'),
  BCRYPT_ROUNDS: z.coerce
    .number({ message: 'BCRYPT_ROUNDS is mandatory and must be a number' })
    .int('BCRYPT_ROUNDS must be an integer')
    .min(4, 'BCRYPT_ROUNDS must be between 4 and 31')
    .max(31, 'BCRYPT_ROUNDS must be between 4 and 31'),
  SEED_USER_PASSWORD: z
    .string({ message: 'SEED_USER_PASSWORD is mandatory, define it in .env' })
    .min(6, 'SEED_USER_PASSWORD must be at least 6 characters long'),
});
