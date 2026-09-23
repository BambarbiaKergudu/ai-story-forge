import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';

import type { Env } from '../env';
import { PanelImageJob } from './panel-image.job';
import {
  PANEL_IMAGE_CONCURRENCY,
  PANEL_IMAGE_QUEUE,
  SCRIPT_CONCURRENCY,
  SCRIPT_QUEUE,
  storyForgeBackoff,
} from './queue-names';
import { redisConnection } from './redis-connection';
import { ScriptJob } from './script.job';

@Injectable()
export class JobsService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(JobsService.name);
  private scriptWorker?: Worker;
  private panelWorker?: Worker;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<Env, true>,
    @Inject(ScriptJob) private readonly scriptJob: ScriptJob,
    @Inject(PanelImageJob) private readonly panelImageJob: PanelImageJob,
  ) {}

  onModuleInit(): void {
    const connection = redisConnection(this.config.get('REDIS_URL', { infer: true }));
    const settings = { backoffStrategy: storyForgeBackoff };

    this.scriptWorker = this.listen(SCRIPT_QUEUE, SCRIPT_CONCURRENCY, connection, settings, (job) =>
      this.scriptJob.handle(job),
    );
    this.panelWorker = this.listen(
      PANEL_IMAGE_QUEUE,
      PANEL_IMAGE_CONCURRENCY,
      connection,
      settings,
      (job) => this.panelImageJob.handle(job),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.scriptWorker?.close();
    await this.panelWorker?.close();
  }

  private listen(
    name: string,
    concurrency: number,
    connection: ReturnType<typeof redisConnection>,
    settings: { backoffStrategy: typeof storyForgeBackoff },
    handler: (job: Job) => Promise<void>,
  ): Worker {
    const worker = new Worker(name, handler, { connection, concurrency, settings });
    worker.on('error', (error) => {
      this.logger.error(`queue ${name} error: ${error.message}`);
    });
    worker.on('failed', (job, error) => {
      this.logger.warn(`queue ${name} job ${job?.id ?? 'unknown'} failed: ${error.message}`);
    });
    this.logger.log(`queue ${name} worker started concurrency=${concurrency}`);
    return worker;
  }
}
