if (!process.env.E2E_DATABASE_URL) {
  throw new Error('E2E_DATABASE_URL is not set. Run integration tests via: npm run e2e:tests');
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
process.env.PORT = '3001';
process.env.JWT_SECRET = 'e2e-jwt-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret-at-least-32-chars-long';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'e2e-test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'e2e-test-secret';
process.env.AWS_S3_PROPERTIES_BUCKET = 'e2e-test-bucket';
process.env.AWS_S3_AVATARS_BUCKET = 'e2e-test-bucket';
process.env.GOOGLE_CLIENT_ID = 'e2e-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'e2e-google-client-secret';
process.env.REDIS_URL = 'redis://localhost:6379';
