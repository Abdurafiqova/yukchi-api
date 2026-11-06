export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900),
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  },
  otp: {
    hashSecret: process.env.OTP_HASH_SECRET ?? '',
    ttlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 120),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60),
    maxPerHour: Number(process.env.OTP_MAX_PER_HOUR ?? 5),
    exposeDevCode: process.env.EXPOSE_DEV_OTP === 'true',
  },
  throttle: {
    ttlSeconds: Number(process.env.THROTTLE_TTL_SECONDS ?? 60),
    limit: Number(process.env.THROTTLE_LIMIT ?? 120),
  },
});

export type AppConfig = ReturnType<typeof configuration>;
