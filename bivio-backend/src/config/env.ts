import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().default('bivio-uploads'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  PAYMENT_GATEWAY_KEY: z.string().optional(),
  PAYMENT_GATEWAY_SECRET: z.string().optional(),
  PAYMENT_WEBHOOK_SECRET: z.string().optional(),

  // Defaults for platform_settings seed — the *authoritative* values live in the
  // database once seeded; these are only fallback/bootstrap values.
  DEFAULT_PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(10),
  DEFAULT_JOB_POSTING_FEE: z.coerce.number().min(0).default(2500),
  DEFAULT_CANDIDATE_PROFILE_FEE: z.coerce.number().min(0).default(499),
  DEFAULT_RECRUITER_POSTING_FEE: z.coerce.number().min(0).default(2500), // OQ-1: one-time, account-level

  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  MAIL_FROM: z.string().default('no-reply@bivio.example'),
  MAIL_PROVIDER_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail loudly and immediately at boot — a missing JWT_SECRET should crash
    // on startup, not surface as a 500 at 3am.
    console.error('Invalid environment configuration:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
