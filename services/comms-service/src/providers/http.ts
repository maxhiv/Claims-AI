import { request } from 'undici';

interface RequestOptions {
  headers?: Record<string, string>;
  body?: string | Buffer | Uint8Array;
  idempotencyKey?: string;
  retries?: number;
  backoffMs?: number[];
}

interface RequestResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
}

const DEFAULT_BACKOFF = [500, 1500, 3000]; // Dev-friendly defaults
const PROD_BACKOFF = [3000, 15000, 60000, 180000]; // Production backoff

export async function requestJSON(
  url: string, 
  options: RequestOptions = {}
): Promise<RequestResponse> {
  const {
    headers = {},
    body,
    idempotencyKey,
    retries = 3,
    backoffMs = DEFAULT_BACKOFF
  } = options;

  // Honor DRY_RUN mode for testing
  if (process.env.DRY_RUN === '1') {
    console.log(`[DRY_RUN] Would request ${url}`, { headers, body });
    return {
      statusCode: 202,
      body: { message: 'DRY_RUN: Request simulated successfully' },
      headers: {}
    };
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'AI-Scheduler/1.0',
    ...headers
  };

  if (idempotencyKey) {
    requestHeaders['Idempotency-Key'] = idempotencyKey;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await request(url, {
        method: body ? 'POST' : 'GET',
        headers: requestHeaders,
        body: body
      });

      const responseBody = await response.body.json();
      const result = {
        statusCode: response.statusCode,
        body: responseBody,
        headers: response.headers as Record<string, string>
      };

      // Success cases
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return result;
      }

      // Don't retry 4xx errors (except 429)
      if (response.statusCode >= 400 && response.statusCode < 500 && response.statusCode !== 429) {
        throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(responseBody)}`);
      }

      // Retry 429 and 5xx errors
      if (attempt < retries && (response.statusCode === 429 || response.statusCode >= 500)) {
        const delay = backoffMs[Math.min(attempt, backoffMs.length - 1)];
        const jitter = Math.random() * 0.1 * delay; // 10% jitter
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        continue;
      }

      throw new Error(`HTTP ${response.statusCode}: ${JSON.stringify(responseBody)}`);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < retries) {
        const delay = backoffMs[Math.min(attempt, backoffMs.length - 1)];
        const jitter = Math.random() * 0.1 * delay;
        console.warn(`Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        continue;
      }
    }
  }

  throw lastError || new Error('Unknown request failure');
}

export function generateIdempotencyKey(data: any): string {
  // Simple hash for idempotency - in production, use a proper hash function
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 32);
}