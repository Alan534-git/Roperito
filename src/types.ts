import type { Request } from 'express';

export type UserRole = 'admin' | 'solicitante' | 'usuario';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  estado_aprobacion: number;
}

export type AuthRequest = Request & { user?: AuthUser };
