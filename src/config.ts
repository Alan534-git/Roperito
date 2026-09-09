import 'dotenv/config';
import path from 'node:path';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value ?? '';
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  jwtSecret: required('JWT_SECRET') || 'desarrollo-secreto-local',
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
  db: {
    host: required('DB_HOST') || '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    database: required('DB_NAME') || 'roperito_solidario',
    user: required('DB_USER') || 'root',
    password: process.env.DB_PASSWORD ?? ''
  }
} as const;
