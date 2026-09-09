import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { checkDatabase } from './db';
import { errorHandler } from './middleware/errors';
import authRoutes from './routes/auth';
import garmentRoutes from './routes/garments';
import adminRoutes from './routes/admin';

const app = express();
fs.mkdirSync(config.uploadDir, { recursive: true });
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(config.uploadDir, { maxAge: '1d' }));
app.use(express.static('public'));
app.use('/api/auth', authRoutes);
app.use('/api/prendas', garmentRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.get('*', (_request, response) => response.sendFile('index.html', { root: 'public' }));
app.use(errorHandler);

checkDatabase().then(() => {
  app.listen(config.port, () => console.log(`Roperito Solidario escuchando en http://localhost:${config.port}`));
}).catch((error: unknown) => {
  console.error('No fue posible conectar con MariaDB.', error);
  process.exit(1);
});
