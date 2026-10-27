import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/** Internal marker a service returns when it wants to attach pagination meta
 *  alongside the payload. Unwrapped here so controllers stay declarative. */
export class Paginated<T> {
  constructor(
    public readonly items: T,
    public readonly meta: Record<string, unknown>,
  ) {}
}

/**
 * Wraps every successful response in `{ success: true, data }` so clients have
 * one shape to parse. Errors get the mirror shape from AllExceptionsFilter.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiEnvelope<any>> {
    return next.handle().pipe(
      map((payload) => {
        if (payload instanceof Paginated) {
          return { success: true as const, data: payload.items, meta: payload.meta };
        }
        return { success: true as const, data: payload ?? null };
      }),
    );
  }
}
