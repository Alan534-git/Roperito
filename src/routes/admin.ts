import { Router } from 'express';
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
  try {
    const state = request.body?.estado;
    if (!['pendiente', 'aprobada', 'rechazada'].includes(state)) { response.status(400).json({ error: 'Estado inválido.' }); return; }
    const [result] = await pool.execute<mysql.ResultSetHeader>('UPDATE solicitudes SET estado = ? WHERE id = ?', [state, request.params.id]);
    if (!result.affectedRows) { response.status(404).json({ error: 'Solicitud no encontrada.' }); return; }
    response.json({ message: 'Solicitud actualizada.' });
  } catch (error) { next(error); }
});

export default router;
