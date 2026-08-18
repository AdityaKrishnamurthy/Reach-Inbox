import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/scheduled', requireAuth, EmailController.getScheduled);
router.get('/sent', requireAuth, EmailController.getSent);
router.get('/archived', requireAuth, EmailController.getArchived);
router.get('/trash', requireAuth, EmailController.getTrash);
router.get('/counts', requireAuth, EmailController.getCounts);
router.post('/by-ids', requireAuth, EmailController.getByIds);

router.patch('/:id/archive', requireAuth, EmailController.archive);
router.patch('/:id/unarchive', requireAuth, EmailController.unarchive);
router.patch('/:id/restore', requireAuth, EmailController.restore);
router.delete('/:id/permanent', requireAuth, EmailController.permanentDelete);
router.delete('/:id', requireAuth, EmailController.softDelete);

router.get('/:id', requireAuth, EmailController.getDetail);

export default router;
