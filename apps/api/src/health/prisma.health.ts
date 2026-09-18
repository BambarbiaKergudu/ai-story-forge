import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(HealthIndicatorService) private readonly indicator: HealthIndicatorService,
  ) {}

  ping(key = 'database') {
    return this.indicator.check(key).attempt(async () => {
      await this.prisma.$queryRaw`SELECT 1`;
    });
  }
}
