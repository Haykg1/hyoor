import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { ApiResponse } from '@repo/shared';

interface HttpExceptionBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

type ErrorResponse = ApiResponse & { statusCode: number };

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? `${exception.message}\n${exception.stack}` : String(exception),
      );
    }

    const body = this.buildErrorBody(exception, status);
    response.status(status).json(body);
  }

  private buildErrorBody(exception: unknown, status: number): ErrorResponse {
    if (exception instanceof ThrottlerException) {
      return {
        success: false,
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many requests. Please slow down and try again shortly.',
      };
    }
    if (!(exception instanceof HttpException)) {
      return {
        success: false,
        statusCode: status,
        message: 'Internal server error',
      };
    }
    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === 'string') {
      return {
        success: false,
        statusCode: status,
        message: exceptionResponse,
      };
    }
    const payload = exceptionResponse as HttpExceptionBody;
    const errors = Array.isArray(payload.message) ? payload.message : undefined;
    const message = Array.isArray(payload.message)
      ? 'Validation failed'
      : (payload.message ?? payload.error ?? 'Request failed');
    return {
      success: false,
      statusCode: status,
      message,
      errors,
    };
  }
}
