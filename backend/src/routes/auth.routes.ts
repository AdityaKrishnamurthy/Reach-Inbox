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
