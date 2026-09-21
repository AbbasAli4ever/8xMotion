import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request & { id?: string }, response: Response, next: NextFunction) {
    request.id = String(request.headers['x-request-id'] ?? randomUUID());
    response.setHeader('x-request-id', request.id);
    next();
  }
}
