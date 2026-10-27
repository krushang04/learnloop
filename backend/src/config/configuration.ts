export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPrefix: process.env.API_PREFIX ?? 'api',
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/learnloop',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'super-secret-dev-key-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});
