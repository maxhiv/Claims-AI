// Loqate address verification provider
import { httpRequest } from './http.js';
export class LoqateProvider {
    name = 'loqate';
    apiKey;
    baseUrl = 'https://api.addressy.com/Cleansing/International/Batch/v1.00/json3.ws';
    findUrl = 'https://api.addressy.com/Capture/Interactive/Find/v1.10/json3.ws';
    constructor() {
        this.apiKey = process.env.LOQATE_API_KEY || 'test-loqate-key';
    }
    async verifyAddress(request) {
        try {
            // Construct the request body for Loqate batch cleansing
            const requestBody = {
                Key: this.apiKey,
                Input: [{
                        Address: this.buildAddressString(request),
                        Country: request.country || 'US'
                    }]
            };
            const response = await httpRequest(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: requestBody,
                timeout: 15000,
                retries: 2
            });
            if (response.statusCode !== 200) {
                return {
                    success: false,
                    confidence: 0,
                    deliverable: false,
                    error: `Loqate API error: ${response.statusCode}`
                };
            }
            const results = Array.isArray(response.body) ? response.body : [response.body];
            if (!results.length || !results[0]) {
                return {
                    success: false,
                    confidence: 0,
                    deliverable: false,
                    error: 'No address found'
                };
            }
            const result = results[0];
            // Calculate confidence based on Loqate's AQI (Address Quality Index)
            const aqi = result.AQI || '';
            let confidence = 0;
            switch (aqi) {
                case 'A':
                    confidence = 1.0;
                    break; // Verified and complete
                case 'B':
                    confidence = 0.8;
                    break; // Verified but incomplete
                case 'C':
                    confidence = 0.6;
                    break; // Verified but with corrections
                case 'D':
                    confidence = 0.4;
                    break; // Premises not verified
                default:
                    confidence = 0.2;
                    break; // Poor quality
            }
            const isDeliverable = aqi === 'A' || aqi === 'B';
            return {
                success: true,
                confidence,
                deliverable: isDeliverable,
                standardized: {
                    line1: result.Address1 || '',
                    line2: result.Address2 || '',
                    city: result.Locality || '',
                    state: result.AdministrativeArea || '',
                    postalCode: result.PostalCode || '',
                    country: result.CountryISO3 || request.country || 'US'
                },
                validation: {
                    isValid: isDeliverable,
                    isPrimaryNumber: !!result.Address1,
                    isStreetName: !!result.Address1,
                    isPostalCode: !!result.PostalCode,
                    suggestions: []
                },
                metadata: result
            };
        }
        catch (error) {
            return {
                success: false,
                confidence: 0,
                deliverable: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getSuggestions(request) {
        try {
            const params = new URLSearchParams({
                Key: this.apiKey,
                Text: request.query,
                Country: request.country || 'US',
                Limit: String(request.maxResults || 10),
                Language: 'en'
            });
            const response = await httpRequest(`${this.findUrl}?${params}`, {
                method: 'GET',
                timeout: 5000,
                retries: 1
            });
            if (response.statusCode !== 200) {
                return {
                    success: false,
                    suggestions: [],
                    error: `Loqate API error: ${response.statusCode}`
                };
            }
            const results = Array.isArray(response.body) ? response.body : [];
            return {
                success: true,
                suggestions: results.map((item) => ({
                    address: item.Text || item.Description || '',
                    confidence: 0.7, // Loqate doesn't provide explicit confidence scores
                    deliverable: item.Type === 'Address' // Only full addresses are deliverable
                }))
            };
        }
        catch (error) {
            return {
                success: false,
                suggestions: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    buildAddressString(request) {
        const parts = [request.address];
        if (request.city)
            parts.push(request.city);
        if (request.state)
            parts.push(request.state);
        if (request.postalCode)
            parts.push(request.postalCode);
        return parts.join(', ');
    }
}
