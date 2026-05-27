import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { RefreshJwtPayload } from '@repo/shared';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AppConfig } from '../../config/configuration';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService<AppConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.refreshSecret', { infer: true }),
      passReqToCallback: true,
    });
  }

  validate(_req: Request, payload: RefreshJwtPayload): RefreshJwtPayload {
    return payload;
  }
}
