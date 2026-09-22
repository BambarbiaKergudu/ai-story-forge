import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
  type HttpException,
} from '@nestjs/common';

import type { LlmResponseError } from '../llm/llm.error';

export function invalidStoryBody(message: string): BadRequestException {
  return new BadRequestException(message);
}

/** Текстовый шаг не удался: историю не сохраняем, клиенту отдаём ошибку шлюза. */
export function storyGenerationFailed(error: LlmResponseError): HttpException {
  if (error.kind === 'unconfigured') {
    return new ServiceUnavailableException('Text generation is not configured');
  }

  return new BadGatewayException('Could not generate a story script');
}
