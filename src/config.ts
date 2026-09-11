import 'dotenv/config';
import path from 'node:path';

const nodeEnv = process.env.NODE_ENV ?? 'development';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value && nodeEnv === 'production') {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value ?? '';
};

export const config = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3000),
  corsOrigin: required('CORS_ORIGIN') || 'http://localhost:3000',
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

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('PORT debe ser un puerto válido.');
if (config.nodeEnv === 'production' && config.jwtSecret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción.');
