import { query } from '../db';

export interface EmailQueryFilters {
  userId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sort?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EmailRowDto {
  id: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  bodyPreview: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  failureReason: string | null;
  etherealPreviewUrl: string | null;
  attempts: number;
  senderName: string;
  senderEmail: string;
  createdAt: string;
}

export class EmailService {
  /**
   * Lists scheduled emails for the authenticated user
   */
  static async getScheduledEmails(filters: EmailQueryFilters): Promise<PaginatedResult<EmailRowDto>> {
    const { userId, page = 1, limit = 20, search = '', status, sort = 'asc' } = filters;
    const offset = (page - 1) * limit;

    const queryParams: any[] = [userId];
    let whereClause = `WHERE c.user_id = $1`;

    if (status && ['scheduled', 'processing'].includes(status)) {
      queryParams.push(status);
      whereClause += ` AND se.status = $${queryParams.length}`;
    } else {
      whereClause += ` AND se.status IN ('scheduled', 'processing')`;
    }

    if (search.trim()) {
      queryParams.push(`%${search.trim()}%`);
      whereClause += ` AND (se.recipient_email ILIKE $${queryParams.length} OR c.subject ILIKE $${queryParams.length} OR c.body ILIKE $${queryParams.length} OR s.display_name ILIKE $${queryParams.length} OR s.email ILIKE $${queryParams.length})`;
    }

    // Get total count
    const countSql = `
      SELECT COUNT(*) as count
      FROM scheduled_emails se
      JOIN campaigns c ON se.campaign_id = c.id
      LEFT JOIN senders s ON c.sender_id = s.id
      ${whereClause}
    `;
    const countRes = await query(countSql, queryParams);
    const total = parseInt(countRes.rows[0].count, 10);

    const sortOrder = sort === 'desc' ? 'DESC' : 'ASC';

    // Get paginated data
    queryParams.push(limit, offset);
    const dataSql = `
      SELECT
        se.id,
        se.campaign_id AS "campaignId",
        se.recipient_email AS "recipientEmail",
        c.subject,
        SUBSTRING(c.body FROM 1 FOR 140) AS "bodyPreview",
        se.status,
        se.scheduled_at AS "scheduledAt",
        se.sent_at AS "sentAt",
        se.failure_reason AS "failureReason",
        se.ethereal_preview_url AS "etherealPreviewUrl",
        se.attempts,
        COALESCE(s.display_name, 'Default Sender') AS "senderName",
        COALESCE(s.email, 'sender@reachinbox.test') AS "senderEmail",
        se.created_at AS "createdAt"
      FROM scheduled_emails se
      JOIN campaigns c ON se.campaign_id = c.id
      LEFT JOIN senders s ON c.sender_id = s.id
      ${whereClause}
      ORDER BY se.scheduled_at ${sortOrder}
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const dataRes = await query(dataSql, queryParams);

    return {
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Lists sent (or failed) emails for the authenticated user
   */
  static async getSentEmails(filters: EmailQueryFilters): Promise<PaginatedResult<EmailRowDto>> {
    const { userId, page = 1, limit = 20, search = '', status, sort = 'desc' } = filters;
    const offset = (page - 1) * limit;

    const queryParams: any[] = [userId];
    let whereClause = `WHERE c.user_id = $1`;

    if (status && ['sent', 'failed'].includes(status)) {
      queryParams.push(status);
      whereClause += ` AND se.status = $${queryParams.length}`;
    } else {
      whereClause += ` AND se.status IN ('sent', 'failed')`;
    }

    if (search.trim()) {
      queryParams.push(`%${search.trim()}%`);
      whereClause += ` AND (se.recipient_email ILIKE $${queryParams.length} OR c.subject ILIKE $${queryParams.length} OR c.body ILIKE $${queryParams.length} OR s.display_name ILIKE $${queryParams.length} OR s.email ILIKE $${queryParams.length})`;
    }

    // Get total count
    const countSql = `
      SELECT COUNT(*) as count
      FROM scheduled_emails se
      JOIN campaigns c ON se.campaign_id = c.id
      LEFT JOIN senders s ON c.sender_id = s.id
      ${whereClause}
    `;
    const countRes = await query(countSql, queryParams);
    const total = parseInt(countRes.rows[0].count, 10);

    const sortOrder = sort === 'asc' ? 'ASC' : 'DESC';

    // Get paginated data
    queryParams.push(limit, offset);
    const dataSql = `
      SELECT
        se.id,
        se.campaign_id AS "campaignId",
        se.recipient_email AS "recipientEmail",
        c.subject,
        SUBSTRING(c.body FROM 1 FOR 140) AS "bodyPreview",
        se.status,
        se.scheduled_at AS "scheduledAt",
        se.sent_at AS "sentAt",
        se.failure_reason AS "failureReason",
        se.ethereal_preview_url AS "etherealPreviewUrl",
        se.attempts,
        COALESCE(s.display_name, 'Default Sender') AS "senderName",
        COALESCE(s.email, 'sender@reachinbox.test') AS "senderEmail",
        se.created_at AS "createdAt"
      FROM scheduled_emails se
      JOIN campaigns c ON se.campaign_id = c.id
      LEFT JOIN senders s ON c.sender_id = s.id
      ${whereClause}
      ORDER BY se.sent_at ${sortOrder} NULLS LAST, se.scheduled_at ${sortOrder}
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const dataRes = await query(dataSql, queryParams);

    return {
      data: dataRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves single email detail by ID for the authenticated user
   */
  static async getEmailDetail(userId: string, emailId: string): Promise<any | null> {
    const sql = `
      SELECT
        se.id,
        se.campaign_id AS "campaignId",
        se.recipient_email AS "recipientEmail",
        c.subject,
        c.body,
        se.status,
        se.scheduled_at AS "scheduledAt",
        se.sent_at AS "sentAt",
        se.failure_reason AS "failureReason",
        se.ethereal_preview_url AS "etherealPreviewUrl",
        se.attempts,
        se.idempotency_key AS "idempotencyKey",
        c.delay_ms AS "delayMs",
        c.hourly_limit AS "hourlyLimit",
        COALESCE(s.display_name, 'Default Sender') AS "senderName",
        COALESCE(s.email, 'sender@reachinbox.test') AS "senderEmail",
        se.created_at AS "createdAt",
        se.updated_at AS "updatedAt"
      FROM scheduled_emails se
      JOIN campaigns c ON se.campaign_id = c.id
      LEFT JOIN senders s ON c.sender_id = s.id
      WHERE se.id = $1 AND c.user_id = $2
    `;

    const res = await query(sql, [emailId, userId]);
    return res.rows[0] || null;
  }

  /**
   * Retrieves summary counts for the sidebar (scheduled count, sent count)
   */
  static async getEmailCounts(userId: string): Promise<{ scheduled: number; sent: number }> {
    const scheduledRes = await query(
      `SELECT COUNT(*) as count
       FROM scheduled_emails se
       JOIN campaigns c ON se.campaign_id = c.id
       WHERE c.user_id = $1 AND se.status IN ('scheduled', 'processing')`,
      [userId]
    );

    const sentRes = await query(
      `SELECT COUNT(*) as count
       FROM scheduled_emails se
       JOIN campaigns c ON se.campaign_id = c.id
       WHERE c.user_id = $1 AND se.status = 'sent'`,
      [userId]
    );

    return {
      scheduled: parseInt(scheduledRes.rows[0].count, 10) || 0,
      sent: parseInt(sentRes.rows[0].count, 10) || 0,
    };
  }
}
