import { pool, query } from './index';
import { config } from '../config/env';
import { SCHEMA_SQL } from './schema-sql';

export const runMigrations = async (): Promise<void> => {
  console.log('[Migration] Starting database migration...');

  try {
    // Run schema DDL
    await pool.query(SCHEMA_SQL);
    console.log('[Migration] Schema tables and triggers applied successfully.');

    // Seed default sender if none exists
    const sendersCheck = await query('SELECT COUNT(*) as count FROM senders');
    if (parseInt(sendersCheck.rows[0].count, 10) === 0) {
      console.log('[Migration] Seeding initial default sender...');
      await query(
        `INSERT INTO senders (display_name, email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, is_default, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          config.smtp.fromName,
          config.smtp.fromEmail,
          config.smtp.host,
          config.smtp.port,
          config.smtp.user || 'demo@ethereal.email',
          config.smtp.pass || 'demopass',
          false,
          true,
          true,
        ]
      );
      console.log('[Migration] Default sender seeded.');
    }

    console.log('[Migration] Database migration completed successfully.');
  } catch (error) {
    console.error('[Migration Error]:', error);
    throw error;
  }
};

// If run directly from CLI
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[Migration] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration Fatal]:', err);
      process.exit(1);
    });
}
