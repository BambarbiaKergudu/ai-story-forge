import type { ServiceJwtClaims } from '@asf/contracts';
import { verifyServiceJwt } from '@asf/contracts/service-jwt';
import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

import type { Env } from '../env';
import { IS_PUBLIC } from './public.decorator';

export type AuthedRequest = {
  headers: { authorization?: string | string[] };
  actor?: ServiceJwtClaims;
};

@Injectable()
export class ServiceJwtGuard implements CanActivate {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<Env, true>,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = bearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing service token');
    }

    try {
      request.actor = verifyServiceJwt(
        token,
        this.config.get('SERVICE_JWT_SECRET', { infer: true }),
      );
      return true;
    } catch {
      throw new UnauthorizedException('Invalid service token');
    }
  }
}

function bearerToken(header: string | string[] | undefined): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith('Bearer ')) {
    return undefined;
  }

  const token = value.slice('Bearer '.length).trim();
  return token.length > 0 ? token : undefined;
}
