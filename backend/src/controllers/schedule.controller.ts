import { Request, Response } from 'express';
import { z } from 'zod';
import { ScheduleService } from '../services/schedule.service';
import { RecipientParser } from '../utils/recipient.parser';

const createScheduleSchema = z.object({
  senderId: z.string().uuid().optional().nullable(),
  recipients: z.union([z.string(), z.array(z.string())]),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required'),
  startAt: z.string().optional(),
  delayMs: z.number().int().min(0).max(3600000).optional(),
  hourlyLimit: z.number().int().min(1).max(10000).optional(),
});

const parseRecipientsSchema = z.object({
  recipients: z.union([z.string(), z.array(z.string())]),
});

export class ScheduleController {
  /**
   * POST /api/schedules
   * Creates a new campaign and schedules BullMQ delayed email jobs
   */
  static async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const parseResult = createScheduleSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { senderId, recipients, subject, body, startAt, delayMs, hourlyLimit } = parseResult.data;

      const result = await ScheduleService.createSchedule({
        userId: req.user.id,
        senderId,
        recipients,
        subject,
        body,
        startAt,
        delayMs,
        hourlyLimit,
      });

      res.status(201).json({
        message: 'Campaign scheduled successfully',
        ...result,
      });
    } catch (error: any) {
      console.error('[Create Schedule Error]:', error);
      res.status(400).json({ error: error.message || 'Failed to schedule campaign' });
    }
  }

  /**
   * POST /api/schedules/parse-recipients
   * Convenience utility to validate and count email addresses from raw text/CSV
   */
  static parseRecipients(req: Request, res: Response): void {
    const parseResult = parseRecipientsSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid recipients payload',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const parsed = RecipientParser.parse(parseResult.data.recipients);
    res.json(parsed);
  }
}
