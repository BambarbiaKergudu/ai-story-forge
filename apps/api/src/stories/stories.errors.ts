import { GUEST_DAILY_LIMIT_CODE } from '@asf/contracts';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

export function invalidStoryBody(message: string): BadRequestException {
  return new BadRequestException(message);
}

export function guestDailyLimit(): HttpException {
  return new HttpException(
    { code: GUEST_DAILY_LIMIT_CODE, message: 'Guest daily story limit reached' },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
