import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export class Paginated<T> {
  constructor(
    public readonly items: T,
    public readonly meta: Record<string, unknown>,
  ) {}
}

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
