import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '@repo/shared';
import type { Socket } from 'socket.io';

import type { RequestUser } from '../../auth/decorators/current-user.decorator';

@Injectable()
export class WsJwtGuard {
  constructor(private readonly jwtService: JwtService) {}

  authenticate(client: Socket): RequestUser {
    const authToken = client.handshake.auth?.token;
    const header = client.handshake.headers.authorization;
    const bearer =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice('Bearer '.length).trim()
        : '';
    const token = (typeof authToken === 'string' ? authToken.trim() : '') || bearer;
    if (!token) {
      throw new UnauthorizedException('Invalid or missing access token');
    }
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return { userId: payload.sub, role: payload.role };
    } catch {
      throw new UnauthorizedException('Invalid or missing access token');
    }
  }
}
