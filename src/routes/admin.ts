import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(authenticate, requireAdmin);

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
    const [result] = await connection.execute<ResultSetHeader>('UPDATE solicitudes SET estado = ? WHERE id = ?', [state, requestId]);
    if (!result.affectedRows) { await connection.rollback(); response.status(404).json({ error: 'Solicitud no encontrada.' }); return; }
    if (state === 'aprobada') {
      const [selected] = await connection.execute<RowDataPacket[]>('SELECT prenda_id FROM solicitudes WHERE id = ?', [requestId]);
      const garmentId = selected[0]?.prenda_id;
      await connection.execute('UPDATE prendas SET disponible = FALSE WHERE id = ?', [garmentId]);
      await connection.execute('UPDATE solicitudes SET estado = \'rechazada\' WHERE prenda_id = ? AND id <> ? AND estado = \'pendiente\'', [garmentId, requestId]);
    }
    await connection.commit();
    response.json({ message: 'Solicitud actualizada.' });
  } catch (error) { await connection.rollback(); if (error instanceof z.ZodError) response.status(400).json({ error: 'Solicitud inválida.' }); else next(error); }
  finally { connection.release(); }
});

export default router;
