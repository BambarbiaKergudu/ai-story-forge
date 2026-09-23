import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { NextConfig } from 'next';

const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    remotePatterns: r2RemotePatterns(),
  },
};

/** Публичный домен R2, чтобы `next/image` мог отдавать сохранённые кадры. */
function r2RemotePatterns(): NonNullable<NextConfig['images']>['remotePatterns'] {
  const raw = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!raw) {
    return [];
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return [];
    }

    return [
      {
        protocol: url.protocol === 'http:' ? 'http' : 'https',
        hostname: url.hostname,
        pathname: '/**',
      },
    ];
  } catch {
    return [];
  }
}

export default nextConfig;
