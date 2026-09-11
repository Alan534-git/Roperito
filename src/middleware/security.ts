import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';

export function verifyRequestOrigin(request: Request, response: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) { next(); return; }
  const origin = request.get('origin');
  if (origin && origin !== config.corsOrigin) {
    response.status(403).json({ error: 'Origen de solicitud no permitido.' });
    return;
  }
  next();
}
