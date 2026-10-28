export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];

  const uri = String(config.MONGODB_URI ?? '');
  if (uri && !/^mongodb(\+srv)?:\/\//.test(uri)) {
    errors.push('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }

  const port = Number(config.PORT ?? 4000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    errors.push('PORT must be an integer between 1 and 65535');
  }

  const secret = String(config.JWT_SECRET ?? '');
  if (config.NODE_ENV === 'production') {
    if (!secret || secret.length < 32) {
      errors.push('JWT_SECRET must be set to at least 32 characters in production');
    }
    if (secret === 'super-secret-dev-key-change-me') {
      errors.push('JWT_SECRET must not be the development default in production');
    }
  }

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join('\n  - ')}`);
  }
  return config;
}
