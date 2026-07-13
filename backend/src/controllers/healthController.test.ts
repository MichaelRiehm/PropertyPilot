import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { HealthController } from './healthController';

function makeRes() {
  return {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  } as unknown as Response & {
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };
}

describe('HealthController.check', () => {
  it('returns the ok status', () => {
    const controller = new HealthController();
    const res = makeRes();

    controller.check({} as Request, res);

    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe('ok');
  });

  it('includes an integer uptime in seconds', () => {
    const controller = new HealthController();
    const res = makeRes();

    controller.check({} as Request, res);

    const body = res.json.mock.calls[0][0];
    expect(typeof body.uptime).toBe('number');
    expect(Number.isInteger(body.uptime)).toBe(true);
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('includes the Node.js runtime version', () => {
    const controller = new HealthController();
    const res = makeRes();

    controller.check({} as Request, res);

    const body = res.json.mock.calls[0][0];
    expect(body.nodeVersion).toBe(process.version);
    expect(body.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
  });

  it('includes the package version from the env var when set', () => {
    const original = process.env.npm_package_version;
    process.env.npm_package_version = '1.2.3';
    try {
      const controller = new HealthController();
      const res = makeRes();

      controller.check({} as Request, res);

      const body = res.json.mock.calls[0][0];
      expect(body.version).toBe('1.2.3');
    } finally {
      process.env.npm_package_version = original;
    }
  });

  it('falls back to "unknown" when the version env var is unset', () => {
    const original = process.env.npm_package_version;
    delete process.env.npm_package_version;
    try {
      const controller = new HealthController();
      const res = makeRes();

      controller.check({} as Request, res);

      const body = res.json.mock.calls[0][0];
      expect(body.version).toBe('unknown');
    } finally {
      if (original !== undefined) {
        process.env.npm_package_version = original;
      }
    }
  });
});
