import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * RN-06: normalises every error response. The real HTTP code of the exception
 * is always preserved and business problems are never turned into 500.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const { statusCode, message, error, details } = this.describe(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      success: false as const,
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    });
  }

  private describe(exception: unknown): {
    statusCode: number;
    message: string;
    error?: string;
    details?: string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { statusCode, message: payload, error: this.reasonPhrase(statusCode) };
      }

      const body = payload as Record<string, unknown>;
      const originalMessage = body.message;

      // ValidationPipe answers with an array of class-validator messages.
      if (Array.isArray(originalMessage)) {
        return {
          statusCode,
          message: 'The request payload is invalid',
          error: (body.error as string) ?? this.reasonPhrase(statusCode),
          details: originalMessage.map(String),
        };
      }

      return {
        statusCode,
        message: typeof originalMessage === 'string' ? originalMessage : exception.message,
        error: (body.error as string) ?? this.reasonPhrase(statusCode),
      };
    }

    // Unknown error: it really is a 500 and internal details are never exposed.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: this.reasonPhrase(HttpStatus.INTERNAL_SERVER_ERROR),
    };
  }

  private reasonPhrase(statusCode: number): string {
    return HttpStatus[statusCode] ?? 'Error';
  }
}
