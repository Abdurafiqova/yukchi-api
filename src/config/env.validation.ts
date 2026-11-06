const REQUIRED = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'OTP_HASH_SECRET'] as const;

const DEV_SECRET_PREFIX = 'dev-';

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const nodeEnv = String(config.NODE_ENV ?? 'development');
  if (nodeEnv === 'production') {
    for (const key of ['JWT_ACCESS_SECRET', 'OTP_HASH_SECRET'] as const) {
      const value = String(config[key]);
      if (value.startsWith(DEV_SECRET_PREFIX) || value.length < 32) {
        throw new Error(`${key} must be a strong random value (>= 32 chars) in production`);
      }
    }
    if (config.EXPOSE_DEV_OTP === 'true') {
      throw new Error('EXPOSE_DEV_OTP must be disabled in production');
    }
  }

  return config;
}
