// Calendarific holiday provider
import { httpRequest } from './http.js';
export class CalendarificProvider {
    name = 'calendarific';
    apiKey;
    baseUrl = 'https://calendarific.com/api/v2/holidays';
    constructor() {
        this.apiKey = process.env.CALENDARIFIC_API_KEY || 'test-calendarific-key';
    }
    async getHolidays(request) {
        try {
            const params = new URLSearchParams({
                api_key: this.apiKey,
                country: request.country.toUpperCase(),
                year: String(request.year),
                type: request.includeObservances ? 'national,local,religious,observance' : 'national'
            });
            if (request.state) {
                params.append('location', request.state);
            }
            const response = await httpRequest(`${this.baseUrl}?${params}`, {
                method: 'GET',
                timeout: 10000,
                retries: 2
            });
            if (response.statusCode !== 200) {
                return {
                    success: false,
                    holidays: [],
                    metadata: { country: request.country, year: request.year, state: request.state },
                    error: `Calendarific API error: ${response.statusCode}`
                };
            }
            const apiResponse = response.body;
            if (apiResponse.meta?.code !== 200) {
                return {
                    success: false,
                    holidays: [],
                    metadata: { country: request.country, year: request.year, state: request.state },
                    error: `Calendarific API error: ${apiResponse.meta?.error_detail || 'Unknown error'}`
                };
            }
            const holidays = (apiResponse.response?.holidays || []).map((holiday) => ({
                name: holiday.name,
                date: holiday.date.iso,
                type: holiday.primary_type || 'holiday',
                affectsBusiness: this.isBusinessAffecting(holiday.primary_type, holiday.type),
                description: holiday.description
            }));
            return {
                success: true,
                holidays,
                metadata: {
                    country: request.country,
                    year: request.year,
                    state: request.state
                }
            };
        }
        catch (error) {
            return {
                success: false,
                holidays: [],
                metadata: { country: request.country, year: request.year, state: request.state },
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async isHoliday(date, country, state) {
        try {
            const year = new Date(date).getFullYear();
            const holidayResponse = await this.getHolidays({
                year,
                country,
                state,
                includeObservances: false // Only check business-affecting holidays
            });
            if (!holidayResponse.success) {
                return false;
            }
            return holidayResponse.holidays.some(holiday => holiday.date === date && holiday.affectsBusiness);
        }
        catch (error) {
            console.error('Error checking holiday status:', error);
            return false;
        }
    }
    isBusinessAffecting(primaryType, types) {
        const businessAffectingTypes = [
            'National holiday',
            'Federal holiday',
            'Public holiday',
            'Bank holiday'
        ];
        // Check primary type
        if (businessAffectingTypes.includes(primaryType)) {
            return true;
        }
        // Check all types
        if (Array.isArray(types)) {
            return types.some(type => businessAffectingTypes.includes(type));
        }
        return false;
    }
}
