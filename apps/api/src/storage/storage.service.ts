import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../env';
import { encodeWebp, panelObjectKey } from './panel-image';
import { putR2Object } from './r2-put';
import { StorageResponseError } from './storage.error';

const DOWNLOAD_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 30_000;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export type StorePanelImageInput = {
  storyId: string;
  panelId: string;
  attempt: number;
  /** PNG от провайдера: уже скачанные байты или временный URL. */
  source: Buffer | { url: string };
};

export type StoredPanelImage = {
  key: string;
  url: string;
  contentType: 'image/webp';
  byteLength: number;
};

/**
 * Скачивает кадр провайдера, если пришёл URL, жмёт WebP и кладёт в R2.
 * Повтор при обрыве делает очередь, не этот клиент.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(@Inject(ConfigService) private readonly config: ConfigService<Env, true>) {}

  async storePanelImage(input: StorePanelImageInput): Promise<StoredPanelImage> {
    const key = panelObjectKey(input.storyId, input.panelId, input.attempt);
    const started = Date.now();
    const source = Buffer.isBuffer(input.source)
      ? input.source
      : await this.download(input.source.url);
    const webp = await encodeWebp(source);
    const { config, publicBaseUrl } = this.r2();
    await putR2Object(config, key, webp, AbortSignal.timeout(UPLOAD_TIMEOUT_MS));

    const url = `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
    this.logger.log(
      `stored panel key=${key} sourceBytes=${source.length} webpBytes=${webp.length} latencyMs=${Date.now() - started}`,
    );

    return { key, url, contentType: 'image/webp', byteLength: webp.length };
  }

  private async download(rawUrl: string): Promise<Buffer> {
    const url = parseHttpsUrl(rawUrl);
    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
    } catch (error) {
      throw fromTransferError(error, DOWNLOAD_TIMEOUT_MS, 'image download');
    }

    if (!response.ok) {
      throw new StorageResponseError('http', `image download responded ${response.status}`, {
        status: response.status,
      });
    }

    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_SOURCE_BYTES) {
      throw new StorageResponseError('invalid', 'image is larger than 15 MB');
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_SOURCE_BYTES) {
      throw new StorageResponseError('invalid', 'image is larger than 15 MB');
    }

    return bytes;
  }

  private r2(): {
    config: {
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
    };
    publicBaseUrl: string;
  } {
    const accountId = this.config.get('R2_ACCOUNT_ID', { infer: true });
    const accessKeyId = this.config.get('R2_ACCESS_KEY_ID', { infer: true });
    const secretAccessKey = this.config.get('R2_SECRET_ACCESS_KEY', { infer: true });
    const bucket = this.config.get('R2_BUCKET', { infer: true });
    const publicBaseUrl = this.config.get('R2_PUBLIC_BASE_URL', { infer: true });

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
      throw new StorageResponseError(
        'unconfigured',
        'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE_URL in .env',
      );
    }

    return {
      config: { accountId, accessKeyId, secretAccessKey, bucket },
      publicBaseUrl,
    };
  }
}

function parseHttpsUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new StorageResponseError('invalid', 'image url is not absolute');
  }

  if (url.protocol !== 'https:') {
    throw new StorageResponseError('invalid', 'image url must be https');
  }

  return url;
}

function fromTransferError(
  error: unknown,
  timeoutMs: number,
  action: string,
): StorageResponseError {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return new StorageResponseError('timeout', `${action} timed out after ${timeoutMs}ms`);
  }

  const message = error instanceof Error ? error.message : 'network error';
  return new StorageResponseError('network', message);
}
