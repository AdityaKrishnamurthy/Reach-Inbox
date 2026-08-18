import { Router } from 'express';
import { SenderController } from '../controllers/sender.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, SenderController.listSenders);

export default router;
