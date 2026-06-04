export interface AppConfig {
  port: number;
  database: { url: string };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    endpoint: string;
  };
  frontend: { url: string };
  mail: {
    from: string;
    resendApiKey: string;
  };
  oauth: {
    google: { clientId: string; clientSecret: string; callbackUrl: string };
    apple: { clientId: string; teamId: string; keyId: string; privateKey: string };
  };
  yandex: { mapsApiKey: string };
  security: {
    throttle: {
      ttlMs: number;
      limit: number;
      authLimit: number;
      writeLimit: number;
      paymentsLimit: number;
      messagingLimit: number;
      geocodingLimit: number;
    };
    trustProxy: boolean;
    jsonBodyLimit: string;
    maxUploadBytes: number;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  aws: {
    region: process.env.AWS_REGION ?? 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.AWS_S3_BUCKET ?? '',
    endpoint: process.env.AWS_ENDPOINT_URL ?? '',
  },
  frontend: {
    url: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },
  mail: {
    from: process.env.MAIL_FROM ?? 'RentStar <noreply@rentstar.am>',
    resendApiKey: process.env.RESEND_API_KEY ?? '',
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/api/v1/auth/google/callback',
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID ?? '',
      teamId: process.env.APPLE_TEAM_ID ?? '',
      keyId: process.env.APPLE_KEY_ID ?? '',
      privateKey: process.env.APPLE_PRIVATE_KEY ?? '',
    },
  },
  yandex: {
    mapsApiKey: process.env.YANDEX_MAPS_API_KEY ?? '',
  },
  security: {
    throttle: {
      ttlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
      authLimit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '10', 10),
      writeLimit: parseInt(process.env.THROTTLE_WRITE_LIMIT ?? '30', 10),
      paymentsLimit: parseInt(process.env.THROTTLE_PAYMENTS_LIMIT ?? '10', 10),
      messagingLimit: parseInt(process.env.THROTTLE_MESSAGING_LIMIT ?? '60', 10),
      geocodingLimit: parseInt(process.env.THROTTLE_GEOCODING_LIMIT ?? '30', 10),
    },
    trustProxy: process.env.TRUST_PROXY === 'true',
    jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? '10mb',
    maxUploadBytes: parseInt(process.env.MAX_UPLOAD_BYTES ?? `${5 * 1024 * 1024}`, 10),
  },
});
