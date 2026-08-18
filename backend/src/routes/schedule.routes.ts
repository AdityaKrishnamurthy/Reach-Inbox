import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, ScheduleController.createSchedule);
router.post('/parse-recipients', requireAuth, ScheduleController.parseRecipients);

export default router;
