import { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodIssue } from 'zod';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { HttpError } from '../errors';
import { DomainValidationError } from '../domain';

function formatPath(path: PropertyKey[]): string {
  return path.length > 0 ? path.join('.') : '_root';
}

function buildFieldMap(issues: ZodIssue[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = formatPath(issue.path);
    // Keep the first message per field — that's what a form would surface.
    if (!(key in fields)) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

function pickPrimaryMessage(issues: ZodIssue[]): string {
  if (issues.length === 0) return 'Request failed validation';
  const first = issues[0];
  return first.message ?? 'Request failed validation';
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const fields = buildFieldMap(err.issues);
    res.status(400).json({
      error: 'ValidationError',
      message: pickPrimaryMessage(err.issues),
      fields,
      issues: err.issues,
    });
    return;
  }

  if (err instanceof DomainValidationError) {
    res.status(400).json({
      error: 'DomainValidationError',
      message: err.errors[0] ?? err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: 'PayloadTooLarge',
        message: 'File is larger than the 10MB limit',
      });
      return;
    }
    res.status(400).json({
      error: 'UploadError',
      message: err.message,
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
      const target = (err.meta as { target?: string[] } | undefined)?.target;
      const fieldList = Array.isArray(target) && target.length > 0 ? target.join(', ') : 'field';
      res.status(409).json({
        error: 'UniqueConstraint',
        message: `A record with that ${fieldList} already exists`,
        target,
      });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({
        error: 'ForeignKeyConstraint',
        message: 'A referenced record does not exist',
        meta: err.meta,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        error: 'NotFound',
        message: 'The requested record was not found',
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
