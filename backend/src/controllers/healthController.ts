import { Request, Response } from 'express';

export class HealthController {
  public check = (_req: Request, res: Response): void => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      version: process.env.npm_package_version ?? 'unknown',
      nodeVersion: process.version,
    });
  };
}
