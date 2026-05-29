// ----------------------------------------------------------------------------
// Stateless backend
//
// PropertyPilot's API holds no per-process server state across requests. Every
// request carries its own authentication context as a bearer JWT and is
// authenticated independently inside `authMiddleware` before the handler runs.
// Persistent state lives only in Postgres and is accessed through Prisma via
// the repository layer, so any request can be served by any backend process.
// The express-rate-limit middleware uses an in-memory store; that is local to
// the process but only protects auth endpoints from brute force on a single
// host and is acceptable to lose on a restart.
//
// Practically this means:
//   - the backend can be scaled horizontally behind a load balancer without
//     sticky sessions,
//   - rolling restarts and zero-downtime deploys do not invalidate active
//     sessions because there are no sessions to invalidate, and
//   - blue/green deployment swaps work because the only persistent state is
//     the shared Postgres instance.
// ----------------------------------------------------------------------------

import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from './prisma';
import { createApiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('[propertypilot-backend] JWT_SECRET is required but was not set');
  process.exit(1);
}

const frontendOrigin = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const app = express();

// Trust the loopback proxy so express-rate-limit reads the real client IP
// instead of seeing every request as coming from 127.0.0.1.
app.set('trust proxy', 'loopback');

app.use(helmet());
app.use(cors({ origin: frontendOrigin }));
app.use(express.json());
app.use('/api', createApiRouter(prisma, jwtSecret));
app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  console.log(
    `[propertypilot-backend] listening on http://localhost:${port} (CORS origin: ${frontendOrigin})`,
  );
});

async function shutdown(): Promise<void> {
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
