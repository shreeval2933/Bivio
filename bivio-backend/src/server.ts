import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { app } from './app';
import { env } from './config/env';
import { prisma } from './shared/prisma';
import { registerSockets } from './sockets';
import { publishStaleReviews } from './jobs/publishStaleReviews';

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: env.CORS_ORIGIN, credentials: true },
});

registerSockets(io);

httpServer.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Bivio API listening on :${env.PORT} (${env.NODE_ENV})`);
});

// Review double-blind auto-publish — see src/jobs/publishStaleReviews.ts for
// the actual logic and the explicit caveat that this setInterval wiring is a
// dev/demo convenience, NOT a production scheduler (it stops on restart and
// isn't safe to run across multiple instances without a lock). Production
// should trigger the same exported function from a real scheduler instead.
const REVIEW_PUBLISH_CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly
setInterval(() => {
  publishStaleReviews().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[publishStaleReviews] failed:', err);
  });
}, REVIEW_PUBLISH_CHECK_INTERVAL_MS);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  httpServer.close(() => process.exit(0));
});
