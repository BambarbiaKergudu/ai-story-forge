import { SetMetadata } from '@nestjs/common';

/** Маршрут без сервисного JWT. Сейчас это только `/v1/health`. */
export const IS_PUBLIC = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC, true);
