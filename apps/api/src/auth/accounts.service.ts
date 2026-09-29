import type { AuthUser, LoginRequest, RegisterRequest } from '@asf/contracts';
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { dummyPasswordHash, hashPassword, verifyPassword } from './password';

@Injectable()
export class AccountsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async register(input: RegisterRequest): Promise<AuthUser> {
    const email = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          name: blankToNull(input.name),
          passwordHash,
          quota: { create: {} },
        },
      });
      return toAuthUser(user);
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(input: LoginRequest): Promise<AuthUser> {
    const email = normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    const stored = user?.passwordHash ?? dummyPasswordHash();
    const matches = await verifyPassword(input.password, stored);
    if (!user?.passwordHash || !matches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return toAuthUser(user);
  }
}

function toAuthUser(user: { id: string; email: string; name: string | null }): AuthUser {
  return { userId: user.id, email: user.email, name: user.name };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function blankToNull(name: string | undefined): string | null {
  const trimmed = name?.trim();
  return trimmed ? trimmed : null;
}

function isUniqueConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
