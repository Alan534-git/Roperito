import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate, requireAdmin } from '../middleware/auth';
import { requireApprovedAdmin } from '../middleware/auth.middleware';
import { listAdminRequests, processAdminRequest } from '../controllers/admin.controller';

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/requests', requireApprovedAdmin, listAdminRequests);
router.post('/request', requireApprovedAdmin, processAdminRequest);

router.get('/solicitudes', async (_request, response, next) => {
  try {
    const [rows] = await pool.execute(`SELECT s.id, s.estado, s.mensaje, s.creado_en, u.nombre AS usuario_nombre, u.email AS usuario_email, p.nombre AS prenda_nombre FROM solicitudes s JOIN usuarios u ON u.id = s.usuario_id JOIN prendas p ON p.id = s.prenda_id ORDER BY s.creado_en DESC`);
    response.json({ solicitudes: rows });
  } catch (error) { next(error); }
});

router.patch('/solicitudes/:id', async (request, response, next) => {
  const connection = await pool.getConnection();
  try {
    const state = request.body?.estado;
    if (!['pendiente', 'aprobada', 'rechazada'].includes(state)) { response.status(400).json({ error: 'Estado inválido.' }); return; }
    const requestId = z.coerce.number().int().positive().parse(request.params.id);
    await connection.beginTransaction();
    const [selected] = await connection.execute<RowDataPacket[]>('SELECT prenda_id, estado FROM solicitudes WHERE id = ? FOR UPDATE', [requestId]);
    if (!selected.length) { await connection.rollback(); response.status(404).json({ error: 'Solicitud no encontrada.' }); return; }
    const garmentId = selected[0].prenda_id as number;
    if (state === 'aprobada') {
      const [garments] = await connection.execute<RowDataPacket[]>('SELECT disponible FROM prendas WHERE id = ? FOR UPDATE', [garmentId]);
      if (!garments[0]?.disponible && selected[0].estado !== 'aprobada') { await connection.rollback(); response.status(409).json({ error: 'La prenda ya no está disponible.' }); return; }
    }
    const [result] = await connection.execute<ResultSetHeader>('UPDATE solicitudes SET estado = ? WHERE id = ?', [state, requestId]);
    if (!result.affectedRows) { await connection.rollback(); response.status(404).json({ error: 'Solicitud no encontrada.' }); return; }
    if (state === 'aprobada') {
      await connection.execute('UPDATE prendas SET disponible = FALSE WHERE id = ?', [garmentId]);
      await connection.execute('UPDATE solicitudes SET estado = \'rechazada\' WHERE prenda_id = ? AND id <> ? AND estado = \'pendiente\'', [garmentId, requestId]);
    }
    await connection.commit();
    response.json({ message: 'Solicitud actualizada.' });
  } catch (error) { await connection.rollback(); if (error instanceof z.ZodError) response.status(400).json({ error: 'Solicitud inválida.' }); else next(error); }
  finally { connection.release(); }
});

export default router;
