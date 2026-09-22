import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ServiceJwtGuard } from './service-jwt.guard';

@Module({
  providers: [{ provide: APP_GUARD, useClass: ServiceJwtGuard }],
})
export class AuthModule {}
