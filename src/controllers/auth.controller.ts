import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { pool } from '../db';
import { config } from '../config';
import { clearAuthCookie, issueAuthCookie, issueToken } from '../middleware/auth';
import type { AuthRequest, AuthUser } from '../types';

const credentialsSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
  rol: z.enum(['admin', 'solicitante']).default('solicitante')
});
const loginSchema = credentialsSchema.pick({ email: true, password: true });
const statusTokenSchema = z.object({ sub: z.string(), purpose: z.literal('pending-admin') });

export function signPendingAdminToken(userId: number): string {
  return jwt.sign({ sub: String(userId), purpose: 'pending-admin' }, config.jwtSecret, { expiresIn: '24h' });
}

export async function register(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const data = credentialsSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    const approval = data.rol === 'admin' ? 0 : 1;
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, estado_aprobacion) VALUES (?, ?, ?, ?, ?)',
      [data.nombre, data.email, passwordHash, data.rol, approval]
    );
    const user: AuthUser = { id: result.insertId, nombre: data.nombre, email: data.email, rol: data.rol, estado_aprobacion: approval };
    if (data.rol === 'solicitante') {
      const token = issueToken(user);
      issueAuthCookie(response, token);
      response.status(200).json({ token, user, redirect: '/' });
      return;
    }
    response.status(202).json({ pendingToken: signPendingAdminToken(result.insertId), user, message: 'Esperando aprobación de los administradores.' });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') response.status(409).json({ error: 'Ese email ya está registrado.' });
    else if (error instanceof z.ZodError) response.status(400).json({ error: 'Revisa los datos ingresados.', details: error.flatten() });
    else next(error);
  }
}

export async function login(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const data = loginSchema.parse(request.body);
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, nombre, email, password_hash, rol, estado_aprobacion FROM usuarios WHERE email = ? LIMIT 1', [data.email]
    );
    const record = rows[0];
    if (!record || !(await bcrypt.compare(data.password as string, record.password_hash as string))) {
      response.status(401).json({ error: 'Email o contraseña incorrectos.' });
      return;
    }
    if (record.rol === 'admin' && record.estado_aprobacion !== 1) {
      response.status(403).json({ error: record.estado_aprobacion === 0 ? 'Tu cuenta de administrador todavía espera aprobación.' : 'La solicitud de administrador fue rechazada.' });
      return;
    }
    const user: AuthUser = { id: record.id as number, nombre: record.nombre as string, email: record.email as string, rol: record.rol as AuthUser['rol'], estado_aprobacion: record.estado_aprobacion as number };
    const token = issueToken(user);
    issueAuthCookie(response, token);
    response.status(200).json({ token, user });
  } catch (error) {
    if (error instanceof z.ZodError) response.status(400).json({ error: 'Email o contraseña inválidos.' });
    else next(error);
  }
}

export async function status(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const token = request.get('authorization')?.replace(/^Bearer\s+/i, '') ?? request.body?.token;
    const payload = statusTokenSchema.parse(jwt.verify(token, config.jwtSecret));
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id, nombre, email, rol, estado_aprobacion FROM usuarios WHERE id = ? LIMIT 1', [Number(payload.sub)]);
    const user = rows[0];
    if (!user || user.rol !== 'admin') { response.status(404).json({ error: 'Solicitud no encontrada.' }); return; }
    if (user.estado_aprobacion === 1) {
      const authUser: AuthUser = { id: user.id as number, nombre: user.nombre as string, email: user.email as string, rol: 'admin', estado_aprobacion: 1 };
      const accessToken = issueToken(authUser);
      issueAuthCookie(response, accessToken);
      response.json({ estado_aprobacion: 1, token: accessToken, user: authUser, redirect: '/admin.html' });
      return;
    }
    response.json({ estado_aprobacion: user.estado_aprobacion });
  } catch (error) { response.status(401).json({ error: 'Token de espera inválido o expirado.' }); }
}

export function logout(_request: Request, response: Response): void { clearAuthCookie(response); response.status(204).send(); }
export function currentUser(request: AuthRequest, response: Response): void { response.json({ user: request.user ?? null }); }
