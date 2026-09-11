import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate, clearAuthCookie, issueAuthCookie, optionalAuthenticate } from '../middleware/auth';
import type { AuthRequest } from '../types';

const router = Router();
const authAttemptLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiados intentos. Esperá unos minutos y probá nuevamente.' } });
const credentials = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72)
});
const loginCredentials = credentials.pick({ email: true, password: true });

router.post('/register', authAttemptLimiter, async (request, response, next) => {
  try {
    const data = credentials.parse(request.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)',
      [data.nombre, data.email, passwordHash]
    );
    const user = { id: result.insertId, nombre: data.nombre, email: data.email, rol: 'usuario' as const };
    issueAuthCookie(response, user);
    response.status(201).json({ user });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') response.status(409).json({ error: 'Ese email ya está registrado.' });
    else if (error instanceof z.ZodError) response.status(400).json({ error: 'Revisa los datos ingresados.', details: error.flatten() });
    else next(error);
  }
});

router.post('/login', authAttemptLimiter, async (request, response, next) => {
  try {
    const data = loginCredentials.parse(request.body);
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE email = ? LIMIT 1', [data.email]
    );
    const record = rows[0];
    if (!record || !(await bcrypt.compare(data.password, record.password_hash))) {
      response.status(401).json({ error: 'Email o contraseña incorrectos.' });
      return;
    }
    const user = { id: record.id as number, nombre: record.nombre as string, email: record.email as string, rol: record.rol as 'admin' | 'usuario' };
    issueAuthCookie(response, user);
    response.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) response.status(400).json({ error: 'Email o contraseña inválidos.' });
    else next(error);
  }
});

router.post('/logout', (_request, response) => { clearAuthCookie(response); response.status(204).send(); });
router.get('/me', optionalAuthenticate, (request: AuthRequest, response) => response.json({ user: request.user ?? null }));

export default router;
