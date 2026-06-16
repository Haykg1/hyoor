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
    propertiesBucket: string;
    avatarsBucket: string;
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
  redis: { url: string };
  openai: { apiKey: string; model: string };
  aiSearch: {
    guestLimit: number;
    verifiedUserLimit: number;
    guestTtlSeconds: number;
    maxContextMessages: number;
    maxMessageChars: number;
    maxCompletionTokens: number;
    guestDailyTokenLimit: number;
    verifiedDailyTokenLimit: number;
    hostCalendarLimit: number;
    hostCalendarDailyTokenLimit: number;
    hostCalendarTtlSeconds: number;
  };
  security: {
    throttle: {
      ttlMs: number;
      limit: number;
      authLimit: number;
      writeLimit: number;
      paymentsLimit: number;
      messagingLimit: number;
      geocodingLimit: number;
      aiSearchLimit: number;
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
    propertiesBucket: process.env.AWS_S3_PROPERTIES_BUCKET ?? process.env.AWS_S3_BUCKET ?? '',
    avatarsBucket: process.env.AWS_S3_AVATARS_BUCKET ?? 'avatars',
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
  redis: {
    url: process.env.REDIS_URL ?? '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  },
  aiSearch: {
    guestLimit: parseInt(process.env.AI_SEARCH_GUEST_LIMIT ?? '5', 10),
    verifiedUserLimit: parseInt(process.env.AI_SEARCH_VERIFIED_USER_LIMIT ?? '10', 10),
    guestTtlSeconds: parseInt(process.env.AI_SEARCH_GUEST_TTL_SECONDS ?? '86400', 10),
    maxContextMessages: parseInt(process.env.AI_SEARCH_MAX_CONTEXT_MESSAGES ?? '6', 10),
    maxMessageChars: parseInt(process.env.AI_SEARCH_MAX_MESSAGE_CHARS ?? '500', 10),
    maxCompletionTokens: parseInt(process.env.AI_SEARCH_MAX_COMPLETION_TOKENS ?? '280', 10),
    guestDailyTokenLimit: parseInt(process.env.AI_SEARCH_GUEST_DAILY_TOKEN_LIMIT ?? '12000', 10),
    verifiedDailyTokenLimit: parseInt(
      process.env.AI_SEARCH_VERIFIED_DAILY_TOKEN_LIMIT ?? '28000',
      10,
    ),
    hostCalendarLimit: parseInt(process.env.AI_SEARCH_HOST_CALENDAR_LIMIT ?? '20', 10),
    hostCalendarDailyTokenLimit: parseInt(
      process.env.AI_SEARCH_HOST_CALENDAR_DAILY_TOKEN_LIMIT ?? '40000',
      10,
    ),
    hostCalendarTtlSeconds: parseInt(
      process.env.AI_SEARCH_HOST_CALENDAR_TTL_SECONDS ?? '86400',
      10,
    ),
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
      aiSearchLimit: parseInt(process.env.THROTTLE_AI_SEARCH_LIMIT ?? '20', 10),
    },
    trustProxy: process.env.TRUST_PROXY === 'true',
    jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? '10mb',
    maxUploadBytes: parseInt(process.env.MAX_UPLOAD_BYTES ?? `${5 * 1024 * 1024}`, 10),
  },
});
