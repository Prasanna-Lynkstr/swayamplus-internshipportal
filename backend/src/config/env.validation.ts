import * as Joi from 'joi';

// Fails app startup loudly (with a clear message) if anything required is
// missing/malformed, instead of a silently-defaulted value surfacing as a
// confusing runtime error later. Every literal that used to be a hardcoded
// constant in a service (OTP timing, pagination size, upload limits, DB pool
// sizing) is validated here and read through ConfigService at the call site.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_POOL_MAX: Joi.number().integer().min(1).default(10),
  DB_POOL_MIN: Joi.number().integer().min(0).default(0),
  DB_POOL_IDLE_MS: Joi.number().integer().min(0).default(10_000),
  DB_POOL_ACQUIRE_MS: Joi.number().integer().min(0).default(30_000),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  CORS_ORIGIN: Joi.string().required(),

  STORAGE_DRIVER: Joi.string().valid('local', 'r2').default('local'),
  UPLOADS_DIR: Joi.string().default('uploads'),
  MAX_UPLOAD_SIZE_MB: Joi.number().integer().min(1).default(10),
  R2_ACCOUNT_ID: Joi.string()
    .allow('')
    .default('')
    .when('STORAGE_DRIVER', { is: 'r2', then: Joi.string().min(1).required() }),
  R2_ACCESS_KEY_ID: Joi.string()
    .allow('')
    .default('')
    .when('STORAGE_DRIVER', { is: 'r2', then: Joi.string().min(1).required() }),
  R2_SECRET_ACCESS_KEY: Joi.string()
    .allow('')
    .default('')
    .when('STORAGE_DRIVER', { is: 'r2', then: Joi.string().min(1).required() }),
  R2_BUCKET: Joi.string()
    .allow('')
    .default('')
    .when('STORAGE_DRIVER', { is: 'r2', then: Joi.string().min(1).required() }),
  R2_PUBLIC_URL: Joi.string()
    .allow('')
    .default('')
    .when('STORAGE_DRIVER', { is: 'r2', then: Joi.string().min(1).required() }),

  OTP_TTL_MINUTES: Joi.number().integer().min(1).default(10),
  OTP_REQUEST_LIMIT: Joi.number().integer().min(1).default(5),
  OTP_VERIFY_ATTEMPT_LIMIT: Joi.number().integer().min(1).default(5),

  DEFAULT_PAGE_SIZE: Joi.number().integer().min(1).default(12),
  MAX_PAGE_SIZE: Joi.number().integer().min(1).default(100),

  ADMIN_EMAIL: Joi.string().optional(),
  ADMIN_PASSWORD: Joi.string().optional(),

  // SMTP is optional — left unset, NotificationsService falls back to its
  // dev-mode console log (same pattern as the OTP stub). Works with any
  // standard SMTP provider (ZeptoMail, SES, Mailgun, etc.), not just one.
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASSWORD: Joi.string().allow('').default(''),
  SMTP_FROM: Joi.string().allow('').default(''),
}).unknown(true);
