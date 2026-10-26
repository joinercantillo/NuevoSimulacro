import * as z from 'zod';

/**
 * Environment validation. If a variable is missing or invalid the app refuses to boot.
 */
export const envValidationSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_SYNCHRONIZE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  API_KEYS: z
    .string()
    .min(1, 'API_KEYS is mandatory and must contain at least one key')
    .refine(
      (value) =>
        value
          .split(',')
          .map((key) => key.trim())
          .filter((key) => key.length > 0).length > 0,
      'API_KEYS must contain at least one valid key',
    ),
});
