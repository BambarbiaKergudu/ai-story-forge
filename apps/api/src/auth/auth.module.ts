import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { ServiceJwtGuard } from './service-jwt.guard';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, { provide: APP_GUARD, useClass: ServiceJwtGuard }],
})
export class AuthModule {}
