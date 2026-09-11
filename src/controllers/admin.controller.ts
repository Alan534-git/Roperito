import type { NextFunction, Request, Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { pool } from '../db';

const actionSchema = z.object({ id: z.coerce.number().int().positive(), accion: z.enum(['aprobar', 'rechazar']) });

export async function listAdminRequests(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT id, nombre, email, creado_en FROM usuarios WHERE rol = 'admin' AND estado_aprobacion = 0 ORDER BY creado_en ASC");
    response.json({ solicitudes: rows });
  } catch (error) { next(error); }
}

export async function processAdminRequest(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const data = actionSchema.parse(request.body);
    const nextState = data.accion === 'aprobar' ? 1 : 2;
    const [result] = await pool.execute<ResultSetHeader>('UPDATE usuarios SET estado_aprobacion = ? WHERE id = ? AND rol = \'admin\' AND estado_aprobacion = 0', [nextState, data.id]);
    if (!result.affectedRows) { response.status(404).json({ error: 'Solicitud pendiente no encontrada.' }); return; }
    response.json({ message: data.accion === 'aprobar' ? 'Administrador aprobado.' : 'Solicitud rechazada.' });
  } catch (error) { if (error instanceof z.ZodError) response.status(400).json({ error: 'Solicitud inválida.' }); else next(error); }
}
