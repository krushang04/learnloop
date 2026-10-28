import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

interface ErrorBody {
  success: false;
  statusCode: number;
  message: string;

  errors?: Record<string, string[]>;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const body = payload as Record<string, any>;
        message = Array.isArray(body.message)
          ? 'Validation failed'
          : (body.message ?? exception.message);
        if (body.errors) errors = body.errors;
        else if (Array.isArray(body.message)) errors = { _: body.message };
      }
    } else if (exception instanceof MongooseError.ValidationError) {
      statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
      message = 'Validation failed';
      errors = Object.entries(exception.errors).reduce<Record<string, string[]>>(
        (acc, [field, err]) => ({ ...acc, [field]: [err.message] }),
        {},
      );
    } else if (exception instanceof MongooseError.CastError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = `Invalid value for "${exception.path}"`;
    } else if (this.isDuplicateKeyError(exception)) {
      statusCode = HttpStatus.CONFLICT;
      const fields = Object.keys((exception as any).keyPattern ?? {});
      message = fields.length
        ? `A record with this ${fields.join(' + ')} already exists`
        : 'Duplicate record';
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${statusCode}: ${message}`);
    }

    const body: ErrorBody = {
      success: false,
      statusCode,
      message,
      ...(errors ? { errors } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private isDuplicateKeyError(exception: unknown): boolean {
    return Boolean(exception && typeof exception === 'object' && (exception as any).code === 11000);
  }
}
