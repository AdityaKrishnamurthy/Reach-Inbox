import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { checkDbConnection } from './db';
import { redis } from './config/redis';

import authRoutes from './routes/auth.routes';
import scheduleRoutes from './routes/schedule.routes';
import emailRoutes from './routes/email.routes';
import senderRoutes from './routes/sender.routes';

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/senders', senderRoutes);

  // Health check endpoint with fast timeouts
  app.get('/api/health', async (req: Request, res: Response) => {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

    try {
      const dbOk = await Promise.race([checkDbConnection(), timeout(1000)]);
      dbStatus = dbOk ? 'connected' : 'disconnected';
    } catch {
      dbStatus = 'disconnected';
    }

    try {
      const pingRes = await Promise.race([redis.ping(), timeout(1000)]);
      redisStatus = pingRes === 'PONG' ? 'connected' : 'disconnected';
    } catch {
      redisStatus = 'disconnected';
    }

    res.json({
      status: 'ok',
      service: 'reachinbox-scheduler-api',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      db: dbStatus,
      redis: redisStatus,
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.path });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: config.nodeEnv === 'development' ? err.message : undefined,
    });
  });

  return app;
};
