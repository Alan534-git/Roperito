import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { currentUser, login, logout, register, status } from '../controllers/auth.controller';
import type { AuthRequest } from '../types';

const router = Router();
const authAttemptLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiados intentos. Esperá unos minutos y probá nuevamente.' } });
router.post('/register', authAttemptLimiter, register);
router.post('/login', authAttemptLimiter, login);
router.post('/logout', logout);
router.get('/me', optionalAuthenticate, currentUser);
router.get('/status', status);

export default router;
