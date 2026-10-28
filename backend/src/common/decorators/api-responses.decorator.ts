import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * The two failures every guarded route shares. Declaring them once keeps the
 * generated docs honest without repeating the same pair on 25 handlers — and
 * means a new endpoint cannot forget them.
 */
export function ApiAuthErrors() {
  return applyDecorators(
    ApiResponse({ status: 401, description: 'Missing, malformed or expired access token' }),
    ApiResponse({ status: 403, description: 'Authenticated, but the wrong role for this route' }),
  );
}

/** Rejected by `ValidationPipe` — a bad field, or an unknown one. */
export function ApiValidationError() {
  return ApiResponse({
    status: 400,
    description: 'Request body or query failed validation. `errors` lists each field.',
  });
}

/** The `:id` exists in the URL but no such document is stored. */
export function ApiNotFound(resource: string) {
  return ApiResponse({ status: 404, description: `No ${resource} with that id` });
}
