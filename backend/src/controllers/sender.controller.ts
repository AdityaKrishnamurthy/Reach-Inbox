// HTTP handlers for listing active sender identities and creating new ones.
// A sender with no explicit SMTP credentials falls back to the shared
// default Ethereal test account, but still gets its own independent
// rate-limit and delay counters in Redis.

import { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { config } from '../config/env';
import { Sender } from '../types/db';

const createSenderSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(255),
  email: z.string().email('Must be a valid email address'),
  // Optional real Ethereal SMTP credentials (from ethereal.email) for a genuinely
  // separate test inbox. Left blank, this sender falls back to the same
  // auto-generated Ethereal test account the default sender uses.
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
});

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

  /**
   * POST /api/senders
   * Creates a new sender identity (supports the multi-sender / per-sender
   * rate-limiting requirement - each sender gets its own Redis rate-limit
   * counters via schedule.service.ts and rate-limit.service.ts).
   */
  static async createSender(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = createSenderSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { displayName, email, smtpUser, smtpPass, smtpHost, smtpPort } = parseResult.data;

      const result = await query<Sender>(
        `INSERT INTO senders (display_name, email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, is_default, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, display_name, email, is_default, active, created_at`,
        [
          displayName,
          email,
          smtpHost || config.smtp.host,
          smtpPort || config.smtp.port,
          smtpUser || 'demo@ethereal.email',
          smtpPass || 'demopass',
          smtpPort === 465,
          false,
          true,
        ]
      );

      res.status(201).json({ sender: result.rows[0] });
    } catch (error: any) {
      console.error('[Create Sender Error]:', error);
      res.status(500).json({ error: 'Failed to create sender' });
    }
  }
}
