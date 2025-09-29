// World Time API timezone provider
import { httpRequest } from './http.js';
export class WorldTimeProvider {
    name = 'worldtime';
    baseUrl = 'http://worldtimeapi.org/api';
    async getTimezone(request) {
        try {
            // First try to get timezone by coordinates using a reverse geocoding approach
            // For simplicity, we'll map coordinates to common timezones
            const timezoneId = this.guessTimezoneFromCoordinates(request.latitude, request.longitude);
            const response = await httpRequest(`${this.baseUrl}/timezone/${timezoneId}`, {
                method: 'GET',
                timeout: 8000,
                retries: 2
            });
            if (response.statusCode !== 200) {
                return {
                    success: false,
                    error: `WorldTime API error: ${response.statusCode}`
                };
            }
            const timeData = response.body;
            return {
                success: true,
                timezone: {
                    timezone: timeData.timezone,
                    offsetMinutes: Math.floor(timeData.raw_offset / 60),
                    observesDST: timeData.dst !== null && timeData.dst_offset !== 0,
                    abbreviation: timeData.abbreviation
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async convertTime(time, fromTimezone, toTimezone) {
        try {
            // Get timezone info for both timezones
            const [fromInfo, toInfo] = await Promise.all([
                this.getTimezoneInfo(fromTimezone),
                this.getTimezoneInfo(toTimezone)
            ]);
            if (!fromInfo || !toInfo) {
                throw new Error('Failed to get timezone information');
            }
            // Parse the input time
            const inputTime = new Date(time);
            // Convert to UTC first
            const utcTime = new Date(inputTime.getTime() - (fromInfo.offsetMinutes * 60000));
            // Convert to target timezone
            const targetTime = new Date(utcTime.getTime() + (toInfo.offsetMinutes * 60000));
            return targetTime.toISOString();
        }
        catch (error) {
            throw new Error(`Time conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getTimezoneInfo(timezoneId) {
        try {
            const response = await httpRequest(`${this.baseUrl}/timezone/${timezoneId}`, {
                method: 'GET',
                timeout: 5000,
                retries: 1
            });
            if (response.statusCode !== 200) {
                return null;
            }
            const timeData = response.body;
            return {
                timezone: timeData.timezone,
                offsetMinutes: Math.floor(timeData.raw_offset / 60),
                observesDST: timeData.dst !== null && timeData.dst_offset !== 0,
                abbreviation: timeData.abbreviation
            };
        }
        catch (error) {
            return null;
        }
    }
    guessTimezoneFromCoordinates(lat, lng) {
        // Simple timezone mapping based on coordinates
        // In production, you'd use a proper timezone database or service
        // United States zones
        if (lat >= 24 && lat <= 71 && lng >= -179 && lng <= -66) {
            if (lng >= -87)
                return 'America/New_York'; // Eastern
            if (lng >= -102)
                return 'America/Chicago'; // Central  
            if (lng >= -115)
                return 'America/Denver'; // Mountain
            return 'America/Los_Angeles'; // Pacific
        }
        // Canada zones
        if (lat >= 42 && lat <= 83 && lng >= -141 && lng <= -52) {
            if (lng >= -90)
                return 'America/Toronto'; // Eastern
            if (lng >= -102)
                return 'America/Winnipeg'; // Central
            if (lng >= -115)
                return 'America/Edmonton'; // Mountain
            return 'America/Vancouver'; // Pacific
        }
        // Europe zones
        if (lat >= 35 && lat <= 71 && lng >= -10 && lng <= 30) {
            if (lng <= 0)
                return 'Europe/London'; // UK
            if (lng <= 15)
                return 'Europe/Paris'; // Central Europe
            return 'Europe/Helsinki'; // Eastern Europe
        }
        // Asia zones
        if (lat >= -10 && lat <= 70 && lng >= 60 && lng <= 180) {
            if (lng <= 90)
                return 'Asia/Kolkata'; // India
            if (lng <= 120)
                return 'Asia/Shanghai'; // China
            if (lng <= 140)
                return 'Asia/Tokyo'; // Japan
            return 'Asia/Seoul'; // Korea
        }
        // Australia zones
        if (lat >= -45 && lat <= -10 && lng >= 110 && lng <= 155) {
            if (lng <= 130)
                return 'Australia/Perth'; // Western
            if (lng <= 145)
                return 'Australia/Adelaide'; // Central
            return 'Australia/Sydney'; // Eastern
        }
        // Default to UTC for unknown regions
        return 'UTC';
    }
}
