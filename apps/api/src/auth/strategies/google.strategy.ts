import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

import type { AppConfig } from '../../config/configuration';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get('oauth.google.clientId', { infer: true }),
      clientSecret: config.get('oauth.google.clientSecret', { infer: true }),
      callbackURL: config.get('oauth.google.callbackUrl', { infer: true }),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google account has no email'), false);
      return;
    }
    try {
      const result = await this.authService.handleOAuthLogin(
        'GOOGLE',
        profile.id,
        email,
        profile.displayName,
      );
      done(null, result);
    } catch (error) {
      done(error as Error, false);
    }
  }
}
