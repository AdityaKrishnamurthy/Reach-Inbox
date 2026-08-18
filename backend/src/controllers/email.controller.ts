import { Request, Response } from 'express';
import { z } from 'zod';
import { EmailService } from '../services/email.service';

const byIdsSchema = z.object({
  ids: z.array(z.string().uuid()).max(500),
});

export class EmailController {
  /**
   * POST /api/emails/by-ids - used by the client-side Starred view
   */
  static async getByIds(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const parseResult = byIdsSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten().fieldErrors });
        return;
      }

      const emails = await EmailService.getEmailsByIds(req.user.id, parseResult.data.ids);
      res.json({ data: emails });
    } catch (error: any) {
      console.error('[Get Emails By Ids Error]:', error);
      res.status(500).json({ error: 'Failed to retrieve starred emails' });
    }
  }

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
      const status = req.query.status as string | undefined;
      const sort = req.query.sort as 'asc' | 'desc' | undefined;

      const result = await EmailService.getScheduledEmails({
        userId: req.user.id,
        page,
        limit,
        search,
        status,
        sort,
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
      const sort = req.query.sort as 'asc' | 'desc' | undefined;

      const result = await EmailService.getSentEmails({
        userId: req.user.id,
        page,
        limit,
        search,
        status,
        sort,
      });

      res.json(result);
    } catch (error: any) {
      console.error('[Get Sent Emails Error]:', error);
      res.status(500).json({ error: 'Failed to retrieve sent emails' });
    }
  }

  /**
   * GET /api/emails/archived
   */
  static async getArchived(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = (req.query.search as string) || '';
      const sort = req.query.sort as 'asc' | 'desc' | undefined;

      const result = await EmailService.getArchivedEmails({ userId: req.user.id, page, limit, search, sort });
      res.json(result);
    } catch (error: any) {
      console.error('[Get Archived Emails Error]:', error);
      res.status(500).json({ error: 'Failed to retrieve archived emails' });
    }
  }

  /**
   * GET /api/emails/trash
   */
  static async getTrash(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const search = (req.query.search as string) || '';
      const sort = req.query.sort as 'asc' | 'desc' | undefined;

      const result = await EmailService.getTrashEmails({ userId: req.user.id, page, limit, search, sort });
      res.json(result);
    } catch (error: any) {
      console.error('[Get Trash Emails Error]:', error);
      res.status(500).json({ error: 'Failed to retrieve trash' });
    }
  }

  /**
   * PATCH /api/emails/:id/archive
   */
  static async archive(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const ok = await EmailService.archiveEmail(req.user.id, req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Email record not found' });
        return;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Archive Email Error]:', error);
      res.status(500).json({ error: 'Failed to archive email' });
    }
  }

  /**
   * PATCH /api/emails/:id/unarchive
   */
  static async unarchive(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const ok = await EmailService.unarchiveEmail(req.user.id, req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Email record not found' });
        return;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Unarchive Email Error]:', error);
      res.status(500).json({ error: 'Failed to unarchive email' });
    }
  }

  /**
   * DELETE /api/emails/:id - moves to Trash (soft delete)
   */
  static async softDelete(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const ok = await EmailService.softDeleteEmail(req.user.id, req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Email record not found' });
        return;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Delete Email Error]:', error);
      res.status(500).json({ error: 'Failed to delete email' });
    }
  }

  /**
   * PATCH /api/emails/:id/restore - restores out of Trash
   */
  static async restore(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const ok = await EmailService.restoreEmail(req.user.id, req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Email record not found' });
        return;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Restore Email Error]:', error);
      res.status(500).json({ error: 'Failed to restore email' });
    }
  }

  /**
   * DELETE /api/emails/:id/permanent - permanent delete from Trash, not reversible
   */
  static async permanentDelete(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const ok = await EmailService.permanentlyDeleteEmail(req.user.id, req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Email record not found in trash' });
        return;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Permanent Delete Email Error]:', error);
      res.status(500).json({ error: 'Failed to permanently delete email' });
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
