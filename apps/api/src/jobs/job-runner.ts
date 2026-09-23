import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { UnrecoverableError } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { isRetryableJobError, jobErrorMessage } from './retryable';

export type JobOutcome = {
  provider?: string;
  costCents?: number;
};

/**
 * Журнал `GenerationJob` переживает очистку Redis.
 * Повторная доставка уже успешной задачи выходит сразу, без второго вызова провайдера.
 */
@Injectable()
export class JobRunner {
  private readonly logger = new Logger(JobRunner.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async run(
    idempotencyKey: string,
    job: Job,
    work: () => Promise<JobOutcome>,
    onFinalFailure?: (error: unknown) => Promise<void>,
  ): Promise<void> {
    const existing = await this.prisma.generationJob.findUnique({ where: { idempotencyKey } });
    if (!existing) {
      throw new UnrecoverableError('generation job row is missing');
    }

    if (existing.status === 'SUCCEEDED') {
      this.logger.log(`skip completed job key=${idempotencyKey}`);
      return;
    }

    await this.prisma.generationJob.update({
      where: { id: existing.id },
      data: { status: 'RUNNING', error: null },
    });

    const started = Date.now();
    try {
      const outcome = await work();
      await this.prisma.generationJob.update({
        where: { id: existing.id },
        data: {
          status: 'SUCCEEDED',
          provider: outcome.provider,
          costCents: outcome.costCents ?? 0,
          latencyMs: Date.now() - started,
          finishedAt: new Date(),
          error: null,
        },
      });
    } catch (error) {
      const attempts = job.opts.attempts ?? 1;
      const final = !isRetryableJobError(error) || job.attemptsMade >= attempts;
      if (final) {
        await this.prisma.generationJob.update({
          where: { id: existing.id },
          data: {
            status: 'FAILED',
            error: jobErrorMessage(error),
            latencyMs: Date.now() - started,
            finishedAt: new Date(),
          },
        });
        if (onFinalFailure) {
          await onFinalFailure(error);
        }
      }

      if (!isRetryableJobError(error)) {
        throw new UnrecoverableError(jobErrorMessage(error));
      }

      throw error;
    }
  }
}
