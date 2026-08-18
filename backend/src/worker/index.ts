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
