import { createApp } from './app';
import { config } from './config/env';
import { startEmailWorker, stopEmailWorker } from './worker/email.worker';
import { runMigrations } from './db/migrate';

const app = createApp();

const startServer = async () => {
  try {
    // Automatically apply schema tables and triggers on startup
    await runMigrations().catch((err) => {
      console.warn('[Startup Migration Warning]:', err.message);
    });

    const server = app.listen(config.port, () => {
      console.log(`Server listening on port ${config.port} in ${config.nodeEnv} mode`);
      // Start BullMQ email worker
      startEmailWorker();
    });

    const gracefulShutdown = async () => {
      console.log('Shutting down gracefully...');
      await stopEmailWorker();
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err: any) {
    console.error('[Fatal Server Startup Error]:', err);
    process.exit(1);
  }
};

startServer();
