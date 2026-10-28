import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export function ApiAuthErrors() {
  return applyDecorators(
    ApiResponse({ status: 401, description: 'Missing, malformed or expired access token' }),
    ApiResponse({ status: 403, description: 'Authenticated, but the wrong role for this route' }),
  );
}

export function ApiValidationError() {
  return ApiResponse({
    status: 400,
    description: 'Request body or query failed validation. `errors` lists each field.',
  });
}

export function ApiNotFound(resource: string) {
  return ApiResponse({ status: 404, description: `No ${resource} with that id` });
}
