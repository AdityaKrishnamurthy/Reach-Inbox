import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/env';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development' && duration > 200) {
    console.warn(`[Slow Query] ${duration}ms: ${text}`);
  }
  return res;
};

export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    const res = await pool.query('SELECT 1 as connected');
    return res.rows.length > 0 && res.rows[0].connected === 1;
  } catch (err) {
    console.error('[DB Connection Check Failed]:', err);
    return false;
  }
};
