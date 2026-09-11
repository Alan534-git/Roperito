import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    response.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'La imagen no puede superar los 5 MB.' : 'No se pudo procesar la imagen.' });
    return;
  }
  if (error instanceof Error && (error as Error & { statusCode?: number }).statusCode === 400) {
    response.status(400).json({ error: error.message });
    return;
  }
  console.error(error);
  response.status(500).json({ error: 'Ocurrió un error inesperado.' });
};
