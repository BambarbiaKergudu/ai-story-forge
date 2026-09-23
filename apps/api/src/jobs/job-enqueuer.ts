import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import type { Env } from '../env';
import { PrismaService } from '../prisma/prisma.service';
import type { PanelImageJobData, ScriptJobData } from './job-data';
import { idempotencyKey } from './idempotency-key';
import { BACKOFF_TYPE, JOB_ATTEMPTS, PANEL_IMAGE_QUEUE, SCRIPT_QUEUE } from './queue-names';
import { redisConnection } from './redis-connection';

const defaultJobOptions = {
  attempts: JOB_ATTEMPTS,
  backoff: { type: BACKOFF_TYPE },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 1000 },
};

@Injectable()
export class JobEnqueuer implements OnApplicationShutdown {
  private readonly logger = new Logger(JobEnqueuer.name);
  private readonly scriptQueue: Queue<ScriptJobData>;
  private readonly panelQueue: Queue<PanelImageJobData>;

  constructor(
    @Inject(ConfigService) config: ConfigService<Env, true>,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    const connection = redisConnection(config.get('REDIS_URL', { infer: true }));
    this.scriptQueue = new Queue<ScriptJobData>(SCRIPT_QUEUE, { connection, defaultJobOptions });
    this.panelQueue = new Queue<PanelImageJobData>(PANEL_IMAGE_QUEUE, {
      connection,
      defaultJobOptions,
    });
  }

  async enqueueScript(input: { storyId: string; attempt?: number }): Promise<void> {
    const attempt = input.attempt ?? 1;
    const key = idempotencyKey({ storyId: input.storyId, kind: 'SCRIPT', attempt });
    const skipped = await this.markQueued({
      key,
      storyId: input.storyId,
      kind: 'SCRIPT',
    });
    if (skipped) {
      return;
    }

    await this.add(this.scriptQueue, SCRIPT_QUEUE, { storyId: input.storyId, attempt }, key);
  }

  async enqueuePanelImage(input: {
    storyId: string;
    panelId: string;
    attempt: number;
  }): Promise<void> {
    const key = idempotencyKey({
      storyId: input.storyId,
      kind: 'PANEL_IMAGE',
      panelId: input.panelId,
      attempt: input.attempt,
    });
    const skipped = await this.markQueued({
      key,
      storyId: input.storyId,
      panelId: input.panelId,
      kind: 'PANEL_IMAGE',
    });
    if (skipped) {
      return;
    }

    await this.add(this.panelQueue, PANEL_IMAGE_QUEUE, input, key);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.scriptQueue.close();
    await this.panelQueue.close();
  }

  private async markQueued(input: {
    key: string;
    storyId: string;
    panelId?: string;
    kind: 'SCRIPT' | 'PANEL_IMAGE';
  }): Promise<boolean> {
    const existing = await this.prisma.generationJob.findUnique({
      where: { idempotencyKey: input.key },
    });
    if (existing?.status === 'SUCCEEDED') {
      return true;
    }

    if (existing?.status === 'FAILED') {
      await this.prisma.generationJob.update({
        where: { id: existing.id },
        data: { status: 'QUEUED', error: null, finishedAt: null },
      });
      return false;
    }

    if (!existing) {
      await this.prisma.generationJob.create({
        data: {
          storyId: input.storyId,
          panelId: input.panelId,
          kind: input.kind,
          status: 'QUEUED',
          idempotencyKey: input.key,
        },
      });
    }

    return false;
  }

  private async add(
    queue: Queue<ScriptJobData> | Queue<PanelImageJobData>,
    name: string,
    data: ScriptJobData | PanelImageJobData,
    jobId: string,
  ): Promise<void> {
    try {
      await (queue as Queue).add(name, data, { jobId });
    } catch (error) {
      if (error instanceof Error && /already exists/i.test(error.message)) {
        this.logger.log(`job already queued id=${jobId}`);
        return;
      }

      throw error;
    }
  }
}
