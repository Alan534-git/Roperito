import { Router } from 'express';
import type { ResultSetHeader } from 'mysql2/promise';
import { z } from 'zod';
import { pool } from '../db';
import { authenticate, requireAdmin } from '../middleware/auth';
import { uploadImage } from '../middleware/upload';
import type { AuthRequest } from '../types';

const router = Router();
const garmentData = z.object({
  nombre: z.string().trim().min(2).max(120),
  categoria: z.string().trim().min(2).max(80),
  talle: z.string().trim().min(1).max(30),
  estado: z.enum(['nuevo', 'muy_bueno', 'bueno', 'a_reparar'])
});

router.get('/', async (_request, response, next) => {
  try {
    const [rows] = await pool.execute('SELECT id, nombre, categoria, talle, estado, ruta_imagen, disponible FROM prendas WHERE disponible = TRUE ORDER BY creado_en DESC');
    response.json({ prendas: rows });
  } catch (error) { next(error); }
});

router.post('/', authenticate, requireAdmin, uploadImage, async (request: AuthRequest, response, next) => {
  try {
    const data = garmentData.parse(request.body);
    const imagePath = request.file ? `/uploads/${request.file.filename}` : null;
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO prendas (nombre, categoria, talle, estado, ruta_imagen) VALUES (?, ?, ?, ?, ?)',
      [data.nombre, data.categoria, data.talle, data.estado, imagePath]
    );
    response.status(201).json({ id: result.insertId, message: 'Prenda agregada al stock.' });
  } catch (error) {
    if (error instanceof z.ZodError) response.status(400).json({ error: 'Completa correctamente las especificaciones.' });
    else next(error);
  }
});

router.post('/:id/solicitar', authenticate, async (request: AuthRequest, response, next) => {
  try {
    const garmentId = z.coerce.number().int().positive().parse(request.params.id);
    const mensaje = z.string().trim().max(500).optional().parse(request.body?.mensaje);
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO solicitudes (usuario_id, prenda_id, mensaje) SELECT ?, id, ? FROM prendas WHERE id = ? AND disponible = TRUE',
      [request.user!.id, mensaje ?? null, garmentId]
    );
    if (!result.affectedRows) { response.status(404).json({ error: 'La prenda ya no está disponible.' }); return; }
    response.status(201).json({ message: 'Solicitud enviada. El equipo revisará tu pedido.' });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') response.status(409).json({ error: 'Ya solicitaste esta prenda.' });
    else if (error instanceof z.ZodError) response.status(400).json({ error: 'Solicitud inválida.' });
    else next(error);
  }
});

export default router;
