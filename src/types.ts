import type { Request } from 'express';

export type UserRole = 'admin' | 'usuario';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
}

export type AuthRequest = Request & { user?: AuthUser };
