import type { ErrorRequestHandler } from 'express';
import multer from 'multer';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError || error instanceof Error) {
    response.status(400).json({ error: error.message });
    return;
  }
  response.status(500).json({ error: 'Ocurrió un error inesperado.' });
};
