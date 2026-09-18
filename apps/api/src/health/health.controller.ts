import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { healthResponseSchema, type HealthResponse } from '@asf/contracts';

import { PrismaHealthIndicator } from './prisma.health';

@Controller()
export class HealthController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(PrismaHealthIndicator) private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get('health')
  async check(): Promise<HealthResponse> {
    await this.health.check([() => this.prismaHealth.ping()]);

    return healthResponseSchema.parse({
      status: 'ok',
      service: 'api',
      uptimeSeconds: Math.floor(process.uptime()),
    });
  }
}
