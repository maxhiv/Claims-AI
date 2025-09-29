// HTTP client with retry logic for address verification providers
const DEFAULT_BACKOFF = 1000; // 1 second
const DEFAULT_TIMEOUT = 30000; // 30 seconds
export async function httpRequest(url, options = {}) {
    const { method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT, retries = 3, backoffMs = DEFAULT_BACKOFF } = options;
    // Honor DRY_RUN mode for testing
    if (process.env.DRY_RUN === '1') {
        console.log(`[DRY_RUN] Would request ${url}`, { headers, body });
        // Return realistic stubs based on URL to ensure verification works
        let mockBody = { message: 'DRY_RUN: Request simulated successfully' };
        // Mock Smarty address verification response
        if (url.includes('api.smarty.com') && url.includes('verify')) {
            mockBody = [{
                    delivery_line_1: '1 Rosedale',
                    last_line: 'Baltimore MD 21229-3957',
                    delivery_point_barcode: '212293957013',
                    components: {
                        primary_number: '1',
                        street_name: 'Rosedale',
                        city_name: 'Baltimore',
                        default_city_name: 'Baltimore',
                        state_abbreviation: 'MD',
                        zipcode: '21229',
                        plus4_code: '3957'
                    },
                    metadata: {
                        record_type: 'S',
                        zip_type: 'Standard',
                        county_fips: '24510',
                        county_name: 'Baltimore City',
                        carrier_route: 'C067',
                        congressional_district: '07',
                        rdi: 'Commercial'
                    },
                    analysis: {
                        dpv_match_y: 'Y',
                        dpv_footnotes: 'AABB',
                        cmra: '',
                        vacant: '',
                        active: 'Y'
                    }
                }];
        }
        // Mock Smarty suggestions response
        if (url.includes('api.smarty.com') && url.includes('suggest')) {
            mockBody = {
                suggestions: [{
                        text: '1 Rosedale, Baltimore MD',
                        street_line: '1 Rosedale',
                        city: 'Baltimore',
                        state: 'MD'
                    }]
            };
        }
        // Mock Loqate verification response
        if (url.includes('api.addressy.com') && url.includes('Cleansing')) {
            mockBody = [{
                    AQI: 'A',
                    AVC: 'V44-I44-P6-100',
                    Address: '1 Rosedale, Baltimore, MD 21229-3957, USA',
                    Address1: '1 Rosedale',
                    Address2: '',
                    AdministrativeArea: 'MD',
                    CountryName: 'United States of America',
                    CountryISO3: 'USA',
                    Locality: 'Baltimore',
                    PostalCode: '21229-3957',
                    SubAdministrativeArea: 'Baltimore City'
                }];
        }
        // Mock Loqate suggestions response
        if (url.includes('api.addressy.com') && url.includes('Find')) {
            mockBody = [{
                    Id: 'US|CP|A|27502280',
                    Type: 'Address',
                    Text: '1 Rosedale, Baltimore, MD',
                    Highlight: '',
                    Description: '1 Rosedale, Baltimore, MD 21229-3957, USA'
                }];
        }
        return {
            statusCode: 200,
            body: mockBody,
            headers: {}
        };
    }
    const requestHeaders = {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Scheduler-CQ/1.0',
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
