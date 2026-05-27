import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

interface ApiStandardErrorsOptions {
  auth?: boolean;
  notFound?: boolean;
  conflict?: boolean;
  throttle?: boolean;
}

export function ApiStandardErrors(options: ApiStandardErrorsOptions = {}): MethodDecorator {
  const { auth = true, notFound = false, conflict = false, throttle = false } = options;
  const decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator> = [
    ApiBadRequestResponse({ description: 'Validation failed or invalid input' }),
  ];
  if (auth) {
    decorators.push(
      ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' }),
      ApiForbiddenResponse({ description: 'Insufficient permissions' }),
    );
  }
  if (notFound) {
    decorators.push(ApiNotFoundResponse({ description: 'Resource not found' }));
  }
  if (conflict) {
    decorators.push(ApiConflictResponse({ description: 'Conflict with existing resource' }));
  }
  if (throttle) {
    decorators.push(
      ApiTooManyRequestsResponse({ description: 'Too many requests; rate limit exceeded' }),
    );
  }
  return applyDecorators(...decorators);
}
