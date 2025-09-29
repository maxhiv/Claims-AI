// HTTP client with retry logic for scheduler providers
const DEFAULT_BACKOFF = 1000; // 1 second
const DEFAULT_TIMEOUT = 30000; // 30 seconds
export async function httpRequest(url, options = {}) {
    const { method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT, retries = 3, backoffMs = DEFAULT_BACKOFF } = options;
    // Honor DRY_RUN mode for testing
    if (process.env.DRY_RUN === '1') {
        console.log(`[DRY_RUN] Would request ${url}`, { headers, body });
        // Return realistic stubs based on URL
        let mockBody = { message: 'DRY_RUN: Request simulated successfully' };
        // Mock Calendarific holidays response
        if (url.includes('calendarific.com') && url.includes('holidays')) {
            mockBody = {
                meta: { code: 200 },
                response: {
                    holidays: [
                        {
                            name: 'New Year\'s Day',
                            description: 'New Year\'s Day is the first day of the year.',
                            country: { id: 'us', name: 'United States' },
                            date: { iso: '2024-01-01', datetime: { year: 2024, month: 1, day: 1 } },
                            type: ['National holiday'],
                            primary_type: 'National holiday',
                            canonical_url: 'https://calendarific.com/holiday/us/new-year-day'
                        },
                        {
                            name: 'Christmas Day',
                            description: 'Christmas Day celebrates the birth of Jesus Christ.',
                            country: { id: 'us', name: 'United States' },
                            date: { iso: '2024-12-25', datetime: { year: 2024, month: 12, day: 25 } },
                            type: ['National holiday'],
                            primary_type: 'National holiday',
                            canonical_url: 'https://calendarific.com/holiday/us/christmas-day'
                        }
                    ]
                }
            };
        }
        // Mock timezone API response
        if (url.includes('timezonedb.com') || url.includes('timezone')) {
            mockBody = {
                status: 'OK',
                message: '',
                countryCode: 'US',
                countryName: 'United States',
                regionName: 'California',
                cityName: 'San Francisco',
                zoneName: 'America/Los_Angeles',
                abbreviation: 'PST',
                gmtOffset: -28800,
                dst: '0',
                zoneStart: 1699171200,
                zoneEnd: 1710064799,
                nextAbbreviation: 'PDT',
                timestamp: Math.floor(Date.now() / 1000),
                formatted: new Date().toISOString()
            };
        }
        // Mock world time API response  
        if (url.includes('worldtimeapi.org')) {
            const now = new Date();
            mockBody = {
                abbreviation: 'PST',
                client_ip: '192.168.1.1',
                datetime: now.toISOString(),
                day_of_week: now.getDay(),
                day_of_year: Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000),
                dst: false,
                dst_from: null,
                dst_offset: 0,
                dst_until: null,
                raw_offset: -28800,
                timezone: 'America/Los_Angeles',
                unixtime: Math.floor(now.getTime() / 1000),
                utc_datetime: now.toISOString(),
                utc_offset: '-08:00',
                week_number: Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000))
            };
        }
        return {
            statusCode: 200,
            body: mockBody,
            headers: {}
        };
    }
    const requestHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Scheduler-Enhanced/1.0',
        ...headers
    };
    // Add idempotency key if provided
    if (options.idempotencyKey) {
        requestHeaders['Idempotency-Key'] = options.idempotencyKey;
    }
    let lastError = new Error('Request failed');
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(url, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const responseText = await response.text();
            let responseBody;
            try {
                responseBody = responseText ? JSON.parse(responseText) : {};
            }
            catch {
                responseBody = { raw: responseText };
            }
            const httpResponse = {
                statusCode: response.status,
                body: responseBody,
                headers: Object.fromEntries(response.headers.entries())
            };
            // Return on success (2xx) or client error (4xx - no point retrying)
            if (response.status < 500) {
                return httpResponse;
            }
            // Server error (5xx) - retry if we have attempts left
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            if (attempt === retries) {
                throw lastError;
            }
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            // Don't retry on client errors or timeout
            if (error?.name === 'AbortError' || lastError?.message?.includes('4')) {
                break;
            }
            if (attempt === retries) {
                throw lastError;
            }
        }
        // Exponential backoff with jitter
        if (attempt < retries) {
            const delay = backoffMs * Math.pow(2, attempt) + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
