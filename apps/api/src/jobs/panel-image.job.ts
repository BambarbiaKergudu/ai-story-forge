import {
  PANEL_COUNT,
  cameraAngleSchema,
  characterSchema,
  shotTypeSchema,
  styleIdSchema,
} from '@asf/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { UnrecoverableError } from 'bullmq';
import { z } from 'zod';

import { ImagesService } from '../images/images.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { toPng } from '../storage/panel-image';
import { StoryEventsService } from '../story-events/story-events.service';
import { fromDbQuality } from '../stories/story.mapper';
import { panelImageJobSchema, type PanelImageJobData } from './job-data';
import { idempotencyKey } from './idempotency-key';
import { JobEnqueuer } from './job-enqueuer';
import { JobRunner } from './job-runner';
import { isRetryableJobError, jobErrorMessage } from './retryable';
import { storySeed } from './story-seed';

function parsePanelJob(data: unknown): PanelImageJobData {
  try {
    return panelImageJobSchema.parse(data);
  } catch (error) {
    throw new UnrecoverableError(jobErrorMessage(error));
  }
}

const charactersSchema = z.array(characterSchema).min(1);

@Injectable()
export class PanelImageJob {
  private readonly logger = new Logger(PanelImageJob.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ImagesService) private readonly images: ImagesService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(JobEnqueuer) private readonly jobs: JobEnqueuer,
    @Inject(JobRunner) private readonly runner: JobRunner,
    @Inject(StoryEventsService) private readonly events: StoryEventsService,
  ) {}

  async handle(job: Job): Promise<void> {
    const data = parsePanelJob(job.data);
    const key = idempotencyKey({
      storyId: data.storyId,
      kind: 'PANEL_IMAGE',
      panelId: data.panelId,
      attempt: data.attempt,
    });
    await this.runner.run(
      key,
      job,
      () => this.work(data),
      (error) => this.failPanel(data, error),
    );
  }

  private async work(data: PanelImageJobData) {
    const panel = await this.prisma.panel.findUnique({
      where: { id: data.panelId },
      include: { story: true },
    });
    if (!panel || panel.storyId !== data.storyId) {
      throw new UnrecoverableError(`panel ${data.panelId} not found`);
    }

    if (panel.status === 'READY' && panel.imageUrl) {
      await this.afterReady(panel.story.id, panel.story.quality, panel.order);
      return {};
    }

    await this.prisma.story.updateMany({
      where: { id: panel.storyId, status: { in: ['SCRIPT_READY', 'PARTIAL', 'COMPLETED'] } },
      data: { status: 'RENDERING' },
    });
    await this.prisma.panel.update({
      where: { id: panel.id },
      data: { status: 'GENERATING', attempts: { increment: 1 }, error: null },
    });
    this.events.publish(panel.storyId, {
      event: 'panel.generating',
      data: { panelId: panel.id },
    });

    const quality = fromDbQuality(panel.story.quality);
    const image = await this.images.generate({
      quality,
      styleId: styleIdSchema.parse(panel.story.styleId),
      characters: charactersSchema.parse(panel.story.characters),
      scene: panel.imagePrompt,
      shotType: shotTypeSchema.parse(panel.shotType),
      cameraAngle: cameraAngleSchema.parse(panel.cameraAngle),
      seed: storySeed(panel.storyId),
      referencePng: await this.referencePng(panel.storyId, quality, panel.order),
    });
    const stored = await this.storage.storePanelImage({
      storyId: panel.storyId,
      panelId: panel.id,
      attempt: data.attempt,
      source: image.bytes,
    });

    await this.prisma.$transaction([
      this.prisma.panel.update({
        where: { id: panel.id },
        data: {
          status: 'READY',
          imageUrl: stored.url,
          imageKey: stored.key,
          error: null,
        },
      }),
      this.prisma.story.update({
        where: { id: panel.storyId },
        data: { costCents: { increment: image.costCents } },
      }),
    ]);

    this.logger.log(`panel ${panel.id} stored key=${stored.key}`);
    this.events.publish(panel.storyId, {
      event: 'panel.ready',
      data: { panelId: panel.id, imageUrl: stored.url },
    });
    await this.afterReady(panel.storyId, panel.story.quality, panel.order);
    return { provider: image.provider, costCents: image.costCents };
  }

  private async referencePng(
    storyId: string,
    quality: 'draft' | 'consistent',
    order: number,
  ): Promise<Buffer | undefined> {
    if (quality !== 'consistent' || order === 1) {
      return undefined;
    }

    const first = await this.prisma.panel.findFirst({ where: { storyId, order: 1 } });
    if (!first?.imageUrl || first.status !== 'READY') {
      throw new UnrecoverableError('panel 1 reference is not ready');
    }

    return toPng(await this.storage.downloadImage(first.imageUrl));
  }

  private async afterReady(
    storyId: string,
    quality: 'DRAFT' | 'CONSISTENT',
    order: number,
  ): Promise<void> {
    if (quality === 'CONSISTENT' && order === 1) {
      const rest = await this.prisma.panel.findMany({
        where: { storyId, order: { gt: 1 } },
        orderBy: { order: 'asc' },
      });
      for (const panel of rest) {
        await this.jobs.enqueuePanelImage({ storyId, panelId: panel.id, attempt: 1 });
      }
    }

    await this.rollup(storyId);
  }

  private async rollup(storyId: string): Promise<void> {
    const panels = await this.prisma.panel.findMany({ where: { storyId } });
    if (panels.length !== PANEL_COUNT) {
      return;
    }

    const terminal = panels.every((panel) => panel.status === 'READY' || panel.status === 'FAILED');
    if (!terminal) {
      return;
    }

    const failed = panels.some((panel) => panel.status === 'FAILED');
    const nextStatus = failed ? 'PARTIAL' : 'COMPLETED';
    const current = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!current || current.status === nextStatus) {
      return;
    }

    const updated = await this.prisma.story.updateMany({
      where: { id: storyId, status: { in: ['SCRIPT_READY', 'RENDERING', 'PARTIAL', 'COMPLETED'] } },
      data: { status: nextStatus },
    });
    if (updated.count === 0) {
      return;
    }

    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || (story.status !== 'COMPLETED' && story.status !== 'PARTIAL')) {
      return;
    }

    this.events.publish(storyId, {
      event: 'story.completed',
      data: { status: story.status, costCents: story.costCents },
    });
  }

  private async failPanel(data: PanelImageJobData, error: unknown): Promise<void> {
    const message = jobErrorMessage(error);
    await this.prisma.panel.updateMany({
      where: { id: data.panelId, status: { not: 'READY' } },
      data: { status: 'FAILED', error: message },
    });
    this.events.publish(data.storyId, {
      event: 'panel.failed',
      data: {
        panelId: data.panelId,
        error: message,
        retryable: isRetryableJobError(error),
      },
    });
    await this.rollup(data.storyId);
  }
}
