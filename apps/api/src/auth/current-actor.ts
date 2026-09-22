import type { ServiceJwtClaims } from '@asf/contracts';
import { createParamDecorator, UnauthorizedException, type ExecutionContext } from '@nestjs/common';

import type { AuthedRequest } from './service-jwt.guard';

export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): ServiceJwtClaims => {
  const request = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!request.actor) {
    throw new UnauthorizedException('Missing service token');
  }

  return request.actor;
});
