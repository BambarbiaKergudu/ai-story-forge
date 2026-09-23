import { BadRequestException } from '@nestjs/common';

export function invalidStoryBody(message: string): BadRequestException {
  return new BadRequestException(message);
}
