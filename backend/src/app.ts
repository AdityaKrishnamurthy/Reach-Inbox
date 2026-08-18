import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { checkDbConnection } from './db';
import { redis } from './config/redis';

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

  // Health check endpoint
  app.get('/api/health', async (req: Request, res: Response) => {
    let dbStatus = 'unknown';
    let redisStatus = 'unknown';

    try {
      const dbOk = await checkDbConnection();
      dbStatus = dbOk ? 'connected' : 'disconnected';
    } catch {
      dbStatus = 'error';
    }

    try {
      const pingRes = await redis.ping();
      redisStatus = pingRes === 'PONG' ? 'connected' : 'disconnected';
    } catch {
      redisStatus = 'error';
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
