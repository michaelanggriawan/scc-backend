import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';

// Load .env so the TypeORM CLI (migration:generate/run/revert) uses the same
// connection as the app. Shell env vars still take precedence over the file.
loadEnv();

import { DataSource } from 'typeorm';
import { join } from 'path';
import { ALL_ENTITIES } from './database.module';

// Standalone DataSource used ONLY by the TypeORM CLI. The running app builds
// its own connection in database.module.ts via Nest's ConfigService.
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'scc',
  entities: ALL_ENTITIES,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});

export default dataSource;
