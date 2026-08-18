import { Request, Response } from 'express';
import { query } from '../db';
import { Sender } from '../types/db';

export class SenderController {
  /**
   * GET /api/senders
   * Lists available active senders
   */
  static async listSenders(req: Request, res: Response): Promise<void> {
    try {
      const result = await query<Sender>(
        'SELECT id, display_name, email, is_default, active, created_at FROM senders WHERE active = TRUE ORDER BY is_default DESC, display_name ASC'
      );

      res.json({ senders: result.rows });
    } catch (error: any) {
      console.error('[List Senders Error]:', error);
      res.status(500).json({ error: 'Failed to retrieve senders' });
    }
  }
}
