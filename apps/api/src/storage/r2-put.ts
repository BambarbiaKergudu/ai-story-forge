import { createHash, createHmac } from 'node:crypto';

import { StorageResponseError } from './storage.error';

const REGION = 'auto';
const SERVICE = 's3';

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export async function putR2Object(
  config: R2Config,
  key: string,
  body: Buffer,
  signal: AbortSignal,
): Promise<void> {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const { amzDate, dateStamp } = amzDates();
  const payloadHash = sha256(body);
  const canonicalUri = `/${encodeURIComponent(config.bucket)}/${encodeKey(key)}`;
  const canonicalHeaders = [
    `cache-control:public, max-age=31536000, immutable`,
    `content-type:image/webp`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n');
  const signedHeaders = 'cache-control;content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');
  const signature = createHmac('sha256', signingKey(config.secretAccessKey, dateStamp))
    .update(stringToSign)
    .digest('hex');
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  let response: Response;
  try {
    response = await fetch(`https://${host}${canonicalUri}`, {
      method: 'PUT',
      headers: {
        authorization,
        'cache-control': 'public, max-age=31536000, immutable',
        'content-type': 'image/webp',
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
      body,
      signal,
    });
  } catch (error) {
    if (error instanceof StorageResponseError) {
      throw error;
    }

    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new StorageResponseError('timeout', 'r2 upload timed out');
    }

    const message = error instanceof Error ? error.message : 'network error';
    throw new StorageResponseError('network', message);
  }

  if (!response.ok) {
    throw new StorageResponseError('http', `r2 upload responded ${response.status}`, {
      status: response.status,
    });
  }
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

function amzDates(now = new Date()): { amzDate: string; dateStamp: string } {
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function signingKey(secret: string, dateStamp: string): Buffer {
  const dateKey = createHmac('sha256', `AWS4${secret}`).update(dateStamp).digest();
  const regionKey = createHmac('sha256', dateKey).update(REGION).digest();
  const serviceKey = createHmac('sha256', regionKey).update(SERVICE).digest();
  return createHmac('sha256', serviceKey).update('aws4_request').digest();
}
