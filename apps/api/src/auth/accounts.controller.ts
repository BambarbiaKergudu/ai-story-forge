import { loginRequestSchema, registerRequestSchema, type AuthUser } from '@asf/contracts';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import type { ZodType } from 'zod';

import { AccountsService } from './accounts.service';

@Controller('auth')
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accounts: AccountsService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: unknown): Promise<AuthUser> {
    return this.accounts.register(parseBody(registerRequestSchema, body));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: unknown): Promise<AuthUser> {
    return this.accounts.login(parseBody(loginRequestSchema, body));
  }
}

function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    throw new BadRequestException(message);
  }

  return parsed.data;
}
