import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2/promise';
import { config } from '../config';
import { pool } from '../db';
import type { AuthRequest, AuthUser } from '../types';

function readToken(request: AuthRequest): string | undefined {
  return request.cookies.roperito_token as string | undefined ?? request.get('authorization')?.replace(/^Bearer\s+/i, '');
}

export async function requireApprovedAdmin(request: AuthRequest, response: Response, next: NextFunction): Promise<void> {
  const token = readToken(request);
  if (!token) { response.status(401).json({ error: 'Debes iniciar sesión.' }); return; }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id, nombre, email, rol, estado_aprobacion FROM usuarios WHERE id = ? LIMIT 1', [payload.id]);
    const user = rows[0];
    if (!user || user.rol !== 'admin' || user.estado_aprobacion !== 1) { response.status(403).json({ error: 'Se requiere un administrador aprobado.' }); return; }
    request.user = { id: user.id as number, nombre: user.nombre as string, email: user.email as string, rol: 'admin', estado_aprobacion: 1 };
    next();
  } catch { response.status(401).json({ error: 'Sesión inválida o expirada.' }); }
}
