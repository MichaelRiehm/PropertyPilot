import path from 'path';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from './prisma';
import { createApiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('[propertypilot-backend] JWT_SECRET is required but was not set');
  process.exit(1);
}

const app = express();

app.use(express.json());
app.use('/api', createApiRouter(prisma, jwtSecret));
app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  console.log(`[propertypilot-backend] listening on http://localhost:${port}`);
});

async function shutdown(): Promise<void> {
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
