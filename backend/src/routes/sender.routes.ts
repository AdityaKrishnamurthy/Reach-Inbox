// Routes for listing and creating sender identities (the "From" addresses
// available when composing a campaign). Mounted at /api/senders.

import { Router } from 'express';
import { SenderController } from '../controllers/sender.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, SenderController.listSenders);
router.post('/', requireAuth, SenderController.createSender);

export default router;
