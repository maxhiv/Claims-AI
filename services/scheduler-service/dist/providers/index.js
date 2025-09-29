// Enhanced scheduler provider registry
import { CalendarificProvider } from './calendarific.js';
import { WorldTimeProvider } from './worldtime.js';
import { EnhancedSchedulerProvider } from './enhanced-scheduler.js';
// Export provider implementations
export { CalendarificProvider } from './calendarific.js';
export { WorldTimeProvider } from './worldtime.js';
export { EnhancedSchedulerProvider } from './enhanced-scheduler.js';
// Provider registries
const holidayProviders = new Map([
    ['calendarific', () => new CalendarificProvider()]
]);
const timezoneProviders = new Map([
    ['worldtime', () => new WorldTimeProvider()]
]);
const schedulerProviders = new Map([
    ['enhanced', () => new EnhancedSchedulerProvider()]
]);
// Holiday provider functions
export function getAvailableHolidayProviders() {
    return Array.from(holidayProviders.keys());
}
export function createHolidayProvider(providerName) {
    const factory = holidayProviders.get(providerName);
    if (!factory) {
        throw new Error(`Unknown holiday provider: ${providerName}. Available: ${getAvailableHolidayProviders().join(', ')}`);
    }
    return factory();
}
export function getHolidayProvider() {
    const providerName = process.env.SCHEDULER_HOLIDAY_PROVIDER || 'calendarific';
    return createHolidayProvider(providerName);
}
// Timezone provider functions
export function getAvailableTimezoneProviders() {
    return Array.from(timezoneProviders.keys());
}
export function createTimezoneProvider(providerName) {
    const factory = timezoneProviders.get(providerName);
    if (!factory) {
        throw new Error(`Unknown timezone provider: ${providerName}. Available: ${getAvailableTimezoneProviders().join(', ')}`);
    }
    return factory();
}
export function getTimezoneProvider() {
    const providerName = process.env.SCHEDULER_TIMEZONE_PROVIDER || 'worldtime';
    return createTimezoneProvider(providerName);
}
// Scheduler provider functions
export function getAvailableSchedulerProviders() {
    return Array.from(schedulerProviders.keys());
}
export function createSchedulerProvider(providerName) {
    const factory = schedulerProviders.get(providerName);
    if (!factory) {
        throw new Error(`Unknown scheduler provider: ${providerName}. Available: ${getAvailableSchedulerProviders().join(', ')}`);
    }
    return factory();
}
export function getSchedulerProvider() {
    const providerName = process.env.SCHEDULER_PROVIDER || 'enhanced';
    return createSchedulerProvider(providerName);
}
/**
 * Initialize all providers (useful for health checks)
 */
export async function initializeAllProviders() {
    const results = {
        holiday: new Map(),
        timezone: new Map(),
        scheduler: new Map()
    };
    // Test holiday providers
    for (const providerName of getAvailableHolidayProviders()) {
        try {
            const provider = createHolidayProvider(providerName);
            results.holiday.set(providerName, !!provider.name);
        }
        catch (error) {
            console.error(`Failed to initialize holiday provider ${providerName}:`, error);
            results.holiday.set(providerName, false);
        }
    }
    // Test timezone providers
    for (const providerName of getAvailableTimezoneProviders()) {
        try {
            const provider = createTimezoneProvider(providerName);
            results.timezone.set(providerName, !!provider.name);
        }
        catch (error) {
            console.error(`Failed to initialize timezone provider ${providerName}:`, error);
            results.timezone.set(providerName, false);
        }
    }
    // Test scheduler providers
    for (const providerName of getAvailableSchedulerProviders()) {
        try {
            const provider = createSchedulerProvider(providerName);
            results.scheduler.set(providerName, !!provider.name);
        }
        catch (error) {
            console.error(`Failed to initialize scheduler provider ${providerName}:`, error);
            results.scheduler.set(providerName, false);
        }
    }
    return results;
}
