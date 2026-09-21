import { storyScriptSchema, type StoryScript } from '@asf/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import type { Env } from '../env';
import { LlmResponseError } from './llm.error';
import { storyScriptJsonSchema } from './story-script.json-schema';

const TIMEOUT_MS = 30_000;

const groqCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
});

@Injectable()
export class GroqClient {
  private readonly logger = new Logger(GroqClient.name);
  private readonly schema = storyScriptJsonSchema();

  constructor(@Inject(ConfigService) private readonly config: ConfigService<Env, true>) {}

  async completeScript(messages: { system: string; user: string }): Promise<StoryScript> {
    const apiKey = this.config.get('GROQ_API_KEY', { infer: true });
    if (!apiKey) {
      throw new LlmResponseError(
        'unconfigured',
        'GROQ_API_KEY is empty. Add a key from https://console.groq.com/keys to .env',
      );
    }

    const model = this.config.get('GROQ_MODEL', { infer: true });
    const baseUrl = this.config.get('GROQ_BASE_URL', { infer: true });
    const started = Date.now();

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages: [
            { role: 'system', content: messages.system },
            { role: 'user', content: messages.user },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'story_script',
              strict: true,
              schema: this.schema,
            },
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      if (isTimeout(error)) {
        throw new LlmResponseError('timeout', `Groq request timed out after ${TIMEOUT_MS}ms`);
      }
      throw error;
    }

    const latencyMs = Date.now() - started;
    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(
        `groq request failed model=${model} status=${response.status} latencyMs=${latencyMs}`,
      );
      throw new LlmResponseError('http', `Groq responded ${response.status}`, {
        status: response.status,
        details: body.slice(0, 500),
      });
    }

    const json: unknown = await response.json();
    const completion = groqCompletionSchema.safeParse(json);
    const content = completion.success ? completion.data.choices[0]?.message.content : undefined;
    if (!content) {
      throw new LlmResponseError('empty', 'Groq returned no message content', {
        details: JSON.stringify(json).slice(0, 500),
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(unwrapFence(content));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'invalid JSON';
      throw new LlmResponseError('invalid_json', 'Groq content is not JSON', {
        details: `${message}: ${content.slice(0, 500)}`,
      });
    }

    const script = storyScriptSchema.safeParse(parsed);
    if (!script.success) {
      const details = script.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ');
      throw new LlmResponseError('schema', 'Groq JSON failed storyScriptSchema', { details });
    }

    this.logger.log(`groq script ready model=${model} latencyMs=${latencyMs}`);
    return script.data;
  }
}

function unwrapFence(content: string): string {
  const trimmed = content.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return fenced?.[1] ?? trimmed;
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}
