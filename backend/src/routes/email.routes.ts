import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/scheduled', requireAuth, EmailController.getScheduled);
router.get('/sent', requireAuth, EmailController.getSent);
router.get('/counts', requireAuth, EmailController.getCounts);
router.get('/:id', requireAuth, EmailController.getDetail);

export default router;
