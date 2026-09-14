import { Controller, Get } from '@nestjs/common';

import { healthResponseSchema, type HealthResponse } from '@asf/contracts';

@Controller()
export class AppController {
  // Заглушка Фазы 0. Полноценный health-модуль на @nestjs/terminus с проверкой
  // Postgres появится в четвёртом пункте фазы.
  @Get('health')
  health(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'api',
      uptimeSeconds: Math.floor(process.uptime()),
    });
  }
}
