// Routes for Google OAuth login/callback and the current-session endpoints
// (fetch logged-in user, logout). Mounted at /api/auth.

import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// OAuth endpoints
router.get('/google', AuthController.googleLogin);
router.get('/google/callback', AuthController.googleCallback);

// Session endpoints
router.get('/me', requireAuth, AuthController.getMe);
router.post('/logout', requireAuth, AuthController.logout);

export default router;
