export interface AppConfig {
  env: string;
  port: number;
  publicAppUrl: string;
  db: {
    type: 'postgres' | 'sqljs';
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
    migrationsRun: boolean;
  };
  jwt: { secret: string; expiresIn: string };
  email: { resendApiKey: string; from: string; fromName: string };
  payments: { maxRejections: number };
  uploads: { dir: string; maxMb: number };
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  seed: { adminEmail: string; adminPassword: string };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
  db: {
    type: (process.env.DB_TYPE as 'postgres') || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'scc',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'no-reply@scc.example.com',
    fromName: process.env.EMAIL_FROM_NAME || 'SCC Venue',
  },
  payments: {
    maxRejections: parseInt(process.env.MAX_PAYMENT_REJECTIONS || '3', 10),
  },
  uploads: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxMb: parseInt(process.env.MAX_UPLOAD_MB || '5', 10),
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@scc.example.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'admin12345',
  },
});
