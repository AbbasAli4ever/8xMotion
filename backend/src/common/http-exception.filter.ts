import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<Request & { id?: string }>();
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const details = error instanceof HttpException ? error.getResponse() : undefined;
    const message = typeof details === 'string' ? details : (details as { message?: unknown })?.message;

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message: message ?? (status === 500 ? 'Internal server error' : 'Request failed'),
      path: request.url,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  }
}
