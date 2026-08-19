// Entry point for running the BullMQ email worker as its own standalone
// process (separate from the HTTP server started in src/index.ts), useful
// for scaling worker concurrency independently of the API.

import { startEmailWorker, stopEmailWorker } from './email.worker';

console.log('[Standalone Worker] Initializing ReachInbox Email Worker...');
const worker = startEmailWorker();

const handleExit = async () => {
  console.log('[Standalone Worker] Received shutdown signal. Cleaning up...');
  await stopEmailWorker();
  process.exit(0);
};

process.on('SIGTERM', handleExit);
process.on('SIGINT', handleExit);
