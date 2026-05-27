import { CanActivate, Injectable } from '@nestjs/common';

@Injectable()
export class NoopThrottlerGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
