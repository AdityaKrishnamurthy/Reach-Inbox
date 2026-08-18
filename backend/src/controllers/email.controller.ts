import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';

export class EmailController {
  /**
   * GET /api/emails/scheduled
   */
  static async getScheduled(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = (req.query.search as string) || '';

      const result = await EmailService.getScheduledEmails({
        userId: req.user.id,
        page,
        limit,
        search,
      });

      res.json(result);
    } catch (error: any) {
      console.error('[Get Scheduled Emails Error]:', error);
      res.status(500).json({ error: 'Failed to retrieve scheduled emails' });
    }
  }

  /**
   * GET /api/emails/sent
   */
  static async getSent(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = (req.query.search as string) || '';
      const status = req.query.status as string | undefined;

      const result = await EmailService.getSentEmails({
        userId: req.user.id,
        page,
        limit,
        search,
        status,
      });

      res.json(result);
    } catch (error: any) {
      console.error('[Get Sent Emails Error]:', error);
      res.status(500).json({ error: 'Failed to retrieve sent emails' });
    }
  }

  /**
   * GET /api/emails/counts
   */
  static async getCounts(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const counts = await EmailService.getEmailCounts(req.user.id);
      res.json(counts);
    } catch (error: any) {
      console.error('[Get Email Counts Error]:', error);
      res.status(500).json({ error: 'Failed to retrieve counts' });
    }
  }

  /**
   * GET /api/emails/:id
   */
  static async getDetail(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const email = await EmailService.getEmailDetail(req.user.id, req.params.id);
      if (!email) {
        res.status(404).json({ error: 'Email record not found' });
        return;
      }

      res.json({ email });
    } catch (error: any) {
      console.error('[Get Email Detail Error]:', error);
      res.status(500).json({ error: 'Failed to retrieve email details' });
    }
  }
}
