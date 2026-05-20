import path from 'path';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

const port = Number(process.env.PORT) || 4000;

app.listen(port, () => {
  console.log(`[propertypilot-backend] listening on http://localhost:${port}`);
});

export default app;
