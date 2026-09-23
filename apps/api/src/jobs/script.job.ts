import { PANEL_COUNT, styleIdSchema } from '@asf/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Quality as DbQuality } from '@prisma/client';
import type { Job } from 'bullmq';
import { UnrecoverableError } from 'bullmq';

import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';
import { scriptJobSchema, type ScriptJobData } from './job-data';
import { idempotencyKey } from './idempotency-key';
import { JobEnqueuer } from './job-enqueuer';
import { JobRunner } from './job-runner';
import { jobErrorMessage } from './retryable';

function parseScriptJob(data: unknown): ScriptJobData {
  try {
    return scriptJobSchema.parse(data);
  } catch (error) {
    throw new UnrecoverableError(jobErrorMessage(error));
  }
}

@Injectable()
export class ScriptJob {
  private readonly logger = new Logger(ScriptJob.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LlmService) private readonly llm: LlmService,
    @Inject(JobEnqueuer) private readonly jobs: JobEnqueuer,
    @Inject(JobRunner) private readonly runner: JobRunner,
  ) {}

  async handle(job: Job): Promise<void> {
    const data = parseScriptJob(job.data);
    const key = idempotencyKey({ storyId: data.storyId, kind: 'SCRIPT', attempt: data.attempt });
    await this.runner.run(
      key,
      job,
      () => this.work(data),
      (error) => this.failStory(data.storyId, error),
    );
  }

  private async work(data: ScriptJobData) {
    const story = await this.prisma.story.findUnique({
      where: { id: data.storyId },
      include: { panels: true },
    });
    if (!story) {
      throw new UnrecoverableError(`story ${data.storyId} not found`);
    }

    if (story.panels.length === 0) {
      const script = await this.llm.generateScript({
        idea: story.idea,
        styleId: styleIdSchema.parse(story.styleId),
      });
      await this.prisma.$transaction([
        this.prisma.story.update({
          where: { id: story.id },
          data: {
            title: script.title,
            characters: script.characters,
            status: 'SCRIPT_READY',
            error: null,
          },
        }),
        this.prisma.panel.createMany({
          data: script.panels.map((panel, index) => ({
            storyId: story.id,
            order: index + 1,
            caption: panel.caption,
            imagePrompt: panel.imagePrompt,
            shotType: panel.shotType,
            cameraAngle: panel.cameraAngle,
            status: 'PENDING',
          })),
        }),
      ]);
      this.logger.log(`story ${story.id} script ready`);
    } else if (story.panels.length !== PANEL_COUNT) {
      throw new UnrecoverableError(`story ${story.id} has ${story.panels.length} panels`);
    }

    await this.fanOut(story.id, story.quality);
    return {};
  }

  /**
   * Черновик рисует все панели сразу: им хватает общего seed.
   * Цельный режим сначала рисует первую панель, остальные ждут её как референс.
   */
  private async fanOut(storyId: string, quality: DbQuality): Promise<void> {
    const panels = await this.prisma.panel.findMany({
      where: { storyId },
      orderBy: { order: 'asc' },
    });
    const targets = quality === 'CONSISTENT' ? panels.filter((panel) => panel.order === 1) : panels;
    for (const panel of targets) {
      await this.jobs.enqueuePanelImage({ storyId, panelId: panel.id, attempt: 1 });
    }
  }

  private async failStory(storyId: string, error: unknown): Promise<void> {
    await this.prisma.story.updateMany({
      where: { id: storyId, status: 'DRAFT_PENDING' },
      data: { status: 'FAILED', error: jobErrorMessage(error) },
    });
  }
}
