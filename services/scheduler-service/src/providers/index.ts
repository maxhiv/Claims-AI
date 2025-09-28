// Enhanced scheduler provider registry

import type { 
  HolidayProvider, 
  TimezoneProvider, 
  SchedulerProvider 
} from './types.js';
import { CalendarificProvider } from './calendarific.js';
import { WorldTimeProvider } from './worldtime.js';
import { EnhancedSchedulerProvider } from './enhanced-scheduler.js';

// Export all provider types
export type { 
  HolidayProvider,
  TimezoneProvider,
  SchedulerProvider,
  HolidayRequest,
  HolidayResponse,
  TimezoneRequest,
  TimezoneResponse,
  SchedulingRequest,
  SchedulingResponse,
  AppointmentSlot
} from './types.js';

// Export provider implementations
export { CalendarificProvider } from './calendarific.js';
export { WorldTimeProvider } from './worldtime.js';
export { EnhancedSchedulerProvider } from './enhanced-scheduler.js';

// Provider registries
const holidayProviders = new Map<string, () => HolidayProvider>([
  ['calendarific', () => new CalendarificProvider()]
]);

const timezoneProviders = new Map<string, () => TimezoneProvider>([
  ['worldtime', () => new WorldTimeProvider()]
]);

const schedulerProviders = new Map<string, () => SchedulerProvider>([
  ['enhanced', () => new EnhancedSchedulerProvider()]
]);

// Holiday provider functions
export function getAvailableHolidayProviders(): string[] {
  return Array.from(holidayProviders.keys());
}

export function createHolidayProvider(providerName: string): HolidayProvider {
  const factory = holidayProviders.get(providerName);
  
  if (!factory) {
    throw new Error(`Unknown holiday provider: ${providerName}. Available: ${getAvailableHolidayProviders().join(', ')}`);
  }
  
  return factory();
}

export function getHolidayProvider(): HolidayProvider {
  const providerName = process.env.SCHEDULER_HOLIDAY_PROVIDER || 'calendarific';
  return createHolidayProvider(providerName);
}

// Timezone provider functions
export function getAvailableTimezoneProviders(): string[] {
  return Array.from(timezoneProviders.keys());
}

export function createTimezoneProvider(providerName: string): TimezoneProvider {
  const factory = timezoneProviders.get(providerName);
  
  if (!factory) {
    throw new Error(`Unknown timezone provider: ${providerName}. Available: ${getAvailableTimezoneProviders().join(', ')}`);
  }
  
  return factory();
}

export function getTimezoneProvider(): TimezoneProvider {
  const providerName = process.env.SCHEDULER_TIMEZONE_PROVIDER || 'worldtime';
  return createTimezoneProvider(providerName);
}

// Scheduler provider functions
export function getAvailableSchedulerProviders(): string[] {
  return Array.from(schedulerProviders.keys());
}

export function createSchedulerProvider(providerName: string): SchedulerProvider {
  const factory = schedulerProviders.get(providerName);
  
  if (!factory) {
    throw new Error(`Unknown scheduler provider: ${providerName}. Available: ${getAvailableSchedulerProviders().join(', ')}`);
  }
  
  return factory();
}

export function getSchedulerProvider(): SchedulerProvider {
  const providerName = process.env.SCHEDULER_PROVIDER || 'enhanced';
  return createSchedulerProvider(providerName);
}

/**
 * Initialize all providers (useful for health checks)
 */
export async function initializeAllProviders(): Promise<{
  holiday: Map<string, boolean>;
  timezone: Map<string, boolean>;
  scheduler: Map<string, boolean>;
}> {
  const results = {
    holiday: new Map<string, boolean>(),
    timezone: new Map<string, boolean>(),
    scheduler: new Map<string, boolean>()
  };
  
  // Test holiday providers
  for (const providerName of getAvailableHolidayProviders()) {
    try {
      const provider = createHolidayProvider(providerName);
      results.holiday.set(providerName, !!provider.name);
    } catch (error) {
      console.error(`Failed to initialize holiday provider ${providerName}:`, error);
      results.holiday.set(providerName, false);
    }
  }
  
  // Test timezone providers
  for (const providerName of getAvailableTimezoneProviders()) {
    try {
      const provider = createTimezoneProvider(providerName);
      results.timezone.set(providerName, !!provider.name);
    } catch (error) {
      console.error(`Failed to initialize timezone provider ${providerName}:`, error);
      results.timezone.set(providerName, false);
    }
  }
  
  // Test scheduler providers
  for (const providerName of getAvailableSchedulerProviders()) {
    try {
      const provider = createSchedulerProvider(providerName);
      results.scheduler.set(providerName, !!provider.name);
    } catch (error) {
      console.error(`Failed to initialize scheduler provider ${providerName}:`, error);
      results.scheduler.set(providerName, false);
    }
  }
  
  return results;
}