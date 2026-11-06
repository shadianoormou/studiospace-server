import 'dotenv/config';
export const config = {
  port: Number(process.env.PORT || 4000),
  origin: (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  mongoUri: process.env.MONGODB_URI,
  database: process.env.MONGODB_DATABASE || 'studiospace',
  secret: process.env.BETTER_AUTH_SECRET,
  jwtSecret: process.env.JWT_SECRET,
  production: process.env.NODE_ENV === 'production',
};
config.origins = [config.origin, config.origin.replace('localhost', '127.0.0.1')];
export function validateConfig() {
  for (const field of ['mongoUri', 'secret', 'jwtSecret']) {
    if (!config[field]) throw new Error(`Missing configuration: ${field}. See .env.example.`);
  }
  if (config.secret.length < 32 || config.jwtSecret.length < 32) throw new Error('Authentication secrets must contain at least 32 characters.');
}
