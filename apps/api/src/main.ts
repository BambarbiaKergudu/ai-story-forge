import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  // Временно console: pino-логгер появится в четвёртом пункте Фазы 0.
  console.log(`api listening on http://localhost:${port}/v1`);
}

void bootstrap();
