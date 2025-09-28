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

const DEFAULT_BACKOFF = [500, 1500, 3000];

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
    
    // Return realistic stubs based on URL to ensure geometry is present
    let mockBody = { message: 'DRY_RUN: Request simulated successfully' };
    
    // Mock Geoapify routing response with geometry
    if (url.includes('api.geoapify.com') && url.includes('routing')) {
      mockBody = {
        features: [{
          properties: {
            distance: 45000, // 45km in meters
            time: 2700,     // 45 minutes in seconds
            legs: [{
              steps: [{
                instruction: { text: 'Head north on Main St' },
                distance: 1000,
                time: 60,
                from_location: [-122.0842499, 37.4224764],
                to_location: [-122.0842499, 37.4324764]
              }]
            }]
          },
          geometry: {
            coordinates: [
              [-122.0842499, 37.4224764],
              [-122.0842499, 37.4324764],
              [-122.4194, 37.7749]
            ]
          }
        }]
      };
    }
    
    // Mock Geoapify geocoding response
    if (url.includes('api.geoapify.com') && url.includes('geocode')) {
      mockBody = {
        features: [{
          geometry: {
            coordinates: [-122.0842499, 37.4224764]
          },
          properties: {
            formatted: '1600 Amphitheatre Parkway, Mountain View, CA',
            confidence: 0.95,
            city: 'Mountain View',
            state: 'CA',
            country: 'United States'
          }
        }]
      };
    }
    
    // Mock TrueWay VRP response
    if (url.includes('api.trueway-api.com') && url.includes('vrp')) {
      mockBody = {
        routes: [{
          distance: 45000,
          duration: 2700,
          stops: [
            { location: { lat: 37.4224764, lng: -122.0842499 } },
            { location: { lat: 37.7749, lng: -122.4194 } }
          ],
          legs: [{
            distance: 45000,
            duration: 2700,
            polyline: 'mock_polyline_string'
          }]
        }],
        optimization_stats: {
          distance_saved: 5000,
          time_saved: 300
        }
      };
    }
    
    return {
      statusCode: 200,
      body: mockBody,
      headers: {}
    };
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'AI-Scheduler-Routing/1.0',
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
        const jitter = Math.random() * 0.1 * delay;
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
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 32);
}