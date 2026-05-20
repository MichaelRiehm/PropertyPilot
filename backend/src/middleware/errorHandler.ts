import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '../errors';
import { DomainValidationError } from '../domain';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Request body or query failed validation',
      issues: err.issues,
    });
    return;
  }

  if (err instanceof DomainValidationError) {
    res.status(400).json({
      error: 'DomainValidationError',
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.name,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: 'UniqueConstraint',
        message: 'A record with the same unique field already exists',
        target: (err.meta as { target?: string[] } | undefined)?.target,
      });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({
        error: 'ForeignKeyConstraint',
        message: 'Referenced record does not exist',
        meta: err.meta,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        error: 'NotFound',
        message: 'Record not found',
      });
      return;
    }
  }

  // Unknown error: log and return generic 500. Do not leak details to the client.
  console.error('[error]', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
  });
}
