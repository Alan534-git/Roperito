import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest, AuthUser } from '../types';
import { config } from '../config';

const COOKIE_NAME = 'roperito_token';

export function issueAuthCookie(response: Response, user: AuthUser): void {
  const token = jwt.sign(user, config.jwtSecret, { expiresIn: '8h' });
  response.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  });
}

export function clearAuthCookie(response: Response): void {
  response.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', path: '/' });
}

export function authenticate(request: AuthRequest, response: Response, next: NextFunction): void {
  const token = request.cookies[COOKIE_NAME] as string | undefined;
  if (!token) {
    response.status(401).json({ error: 'Debes iniciar sesión para continuar.' });
    return;
  }
  try {
    request.user = jwt.verify(token, config.jwtSecret) as AuthUser;
    next();
  } catch {
    clearAuthCookie(response);
    response.status(401).json({ error: 'La sesión expiró. Inicia sesión nuevamente.' });
  }
}

export function requireAdmin(request: AuthRequest, response: Response, next: NextFunction): void {
  if (request.user?.rol !== 'admin') {
    response.status(403).json({ error: 'Esta acción requiere permisos de administrador.' });
    return;
  }
  next();
}
