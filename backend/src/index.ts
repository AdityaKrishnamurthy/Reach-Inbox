import { createApp } from './app';
import { config } from './config/env';
import { startEmailWorker, stopEmailWorker } from './worker/email.worker';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
  // Start email worker
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
