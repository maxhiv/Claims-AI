// Smarty address verification provider
import { httpRequest } from './http.js';
export class SmartyProvider {
    name = 'smarty';
    authId;
    authToken;
    baseUrl = 'https://us-street.api.smarty.com/street-address';
    suggestUrl = 'https://us-autocomplete-pro.api.smarty.com/suggest';
    constructor() {
        this.authId = process.env.SMARTY_AUTH_ID || 'test-auth-id';
        this.authToken = process.env.SMARTY_AUTH_TOKEN || 'test-auth-token';
    }
    async verifyAddress(request) {
        try {
            // Construct query parameters for Smarty API
            const params = new URLSearchParams({
                'auth-id': this.authId,
                'auth-token': this.authToken,
                'street': request.address,
                'match': 'strict'
            });
            if (request.city)
                params.append('city', request.city);
            if (request.state)
                params.append('state', request.state);
            if (request.postalCode)
                params.append('zipcode', request.postalCode);
            const response = await httpRequest(`${this.baseUrl}?${params}`, {
                method: 'GET',
                timeout: 10000,
                retries: 2
            });
            if (response.statusCode !== 200) {
                return {
                    success: false,
                    confidence: 0,
                    deliverable: false,
                    error: `Smarty API error: ${response.statusCode}`
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
            const analysis = result.analysis || {};
            // Calculate confidence based on Smarty's DPV analysis
            let confidence = 0;
            if (analysis.dpv_match_y === 'Y')
                confidence += 0.8;
            if (analysis.active === 'Y')
                confidence += 0.2;
            const isDeliverable = analysis.dpv_match_y === 'Y' && analysis.active === 'Y';
            return {
                success: true,
                confidence: Math.min(confidence, 1),
                deliverable: isDeliverable,
                standardized: {
                    line1: result.delivery_line_1 || '',
                    line2: result.delivery_line_2 || '',
                    city: result.components?.city_name || '',
                    state: result.components?.state_abbreviation || '',
                    postalCode: `${result.components?.zipcode || ''}${result.components?.plus4_code ? '-' + result.components.plus4_code : ''}`,
                    country: 'US'
                },
                validation: {
                    isValid: isDeliverable,
                    isPrimaryNumber: !!result.components?.primary_number,
                    isStreetName: !!result.components?.street_name,
                    isPostalCode: !!result.components?.zipcode,
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
                'auth-id': this.authId,
                'auth-token': this.authToken,
                'search': request.query,
                'max_results': String(request.maxResults || 10),
                'include_only_cities': request.country === 'US' ? '' : request.country || ''
            });
            const response = await httpRequest(`${this.suggestUrl}?${params}`, {
                method: 'GET',
                timeout: 5000,
                retries: 1
            });
            if (response.statusCode !== 200) {
                return {
                    success: false,
                    suggestions: [],
                    error: `Smarty API error: ${response.statusCode}`
                };
            }
            const results = response.body?.suggestions || [];
            return {
                success: true,
                suggestions: results.map((item) => ({
                    address: item.text || '',
                    confidence: 0.8, // Smarty doesn't provide confidence scores
                    deliverable: true // Assume deliverable for suggestions
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
}
