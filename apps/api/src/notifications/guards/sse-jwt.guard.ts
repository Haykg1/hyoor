import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '@repo/shared';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';

import type { RequestUser } from '../../auth/decorators/current-user.decorator';

@Injectable()
export class SseJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const queryToken = request.query.access_token;
    const tokenFromQuery = typeof queryToken === 'string' ? queryToken.trim() : '';
    const tokenFromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    const token = tokenFromQuery || tokenFromHeader;
    if (!token) {
      throw new UnauthorizedException('Invalid or missing access token');
    }
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      request.user = { userId: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or missing access token');
    }
  }
}
