#!/usr/bin/env tsx

// Smoke tests for scheduler service providers
// Run with: npm test

import { 
  initializeAllProviders, 
  getAvailableHolidayProviders,
  getAvailableTimezoneProviders,
  getAvailableSchedulerProviders,
  createHolidayProvider,
  createTimezoneProvider,
  createSchedulerProvider 
} from '../src/providers/index.js';

// Set up test environment
process.env.DRY_RUN = '1';
process.env.CALENDARIFIC_API_KEY = 'test-calendarific-key';

async function testProviderInitialization() {
  console.log('🧪 Testing Provider Initialization...');
  
  try {
    const providers = await initializeAllProviders();
    
    console.log(`✅ Holiday providers: ${Array.from(providers.holiday.keys()).join(', ')}`);
    console.log(`✅ Timezone providers: ${Array.from(providers.timezone.keys()).join(', ')}`);
    console.log(`✅ Scheduler providers: ${Array.from(providers.scheduler.keys()).join(', ')}`);
    
    // Check each provider type
    for (const [name, initialized] of providers.holiday) {
      console.log(`   ${initialized ? '✅' : '❌'} Holiday ${name}: ${initialized ? 'OK' : 'FAILED'}`);
    }
    for (const [name, initialized] of providers.timezone) {
      console.log(`   ${initialized ? '✅' : '❌'} Timezone ${name}: ${initialized ? 'OK' : 'FAILED'}`);
    }
    for (const [name, initialized] of providers.scheduler) {
      console.log(`   ${initialized ? '✅' : '❌'} Scheduler ${name}: ${initialized ? 'OK' : 'FAILED'}`);
    }
    
    const allInitialized = [
      ...Array.from(providers.holiday.values()),
      ...Array.from(providers.timezone.values()),
      ...Array.from(providers.scheduler.values())
    ].every(Boolean);
    
    if (!allInitialized) {
      console.error('❌ Some providers failed to initialize');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Provider initialization failed:', error.message);
    return false;
  }
}

async function testHolidayProvider() {
  console.log('🧪 Testing Holiday Provider...');
  
  try {
    const provider = createHolidayProvider('calendarific');
    
    // Test getting holidays
    const holidayResult = await provider.getHolidays({
      year: 2024,
      country: 'US',
      includeObservances: false
    });
    
    console.log(`✅ Holiday lookup: ${holidayResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Holidays found: ${holidayResult.holidays.length}`);
    console.log(`   Country: ${holidayResult.metadata.country}`);
    console.log(`   Year: ${holidayResult.metadata.year}`);
    
    // Test holiday checking
    const isHoliday = await provider.isHoliday('2024-01-01', 'US');
    console.log(`✅ Holiday check for New Year: ${isHoliday ? 'YES' : 'NO'}`);
    
    return holidayResult.success;
  } catch (error) {
    console.error('❌ Holiday provider test failed:', error.message);
    return false;
  }
}

async function testTimezoneProvider() {
  console.log('🧪 Testing Timezone Provider...');
  
  try {
    const provider = createTimezoneProvider('worldtime');
    
    // Test timezone lookup for San Francisco
    const timezoneResult = await provider.getTimezone({
      latitude: 37.7749,
      longitude: -122.4194
    });
    
    console.log(`✅ Timezone lookup: ${timezoneResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (timezoneResult.timezone) {
      console.log(`   Timezone: ${timezoneResult.timezone.timezone}`);
      console.log(`   Offset: ${timezoneResult.timezone.offsetMinutes} minutes`);
      console.log(`   DST: ${timezoneResult.timezone.observesDST ? 'YES' : 'NO'}`);
    }
    
    // Test time conversion
    const convertedTime = await provider.convertTime(
      '2024-01-01T12:00:00Z',
      'UTC',
      'America/Los_Angeles'
    );
    console.log(`✅ Time conversion: ${convertedTime}`);
    
    return timezoneResult.success;
  } catch (error) {
    console.error('❌ Timezone provider test failed:', error.message);
    return false;
  }
}

async function testSchedulerProvider() {
  console.log('🧪 Testing Enhanced Scheduler Provider...');
  
  try {
    const provider = createSchedulerProvider('enhanced');
    
    // Test available slots
    const slotsResult = await provider.findAvailableSlots(
      { latitude: 37.7749, longitude: -122.4194 },
      60, // 1 hour duration
      {
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-19T23:59:59Z'
      }
    );
    
    console.log(`✅ Available slots: ${slotsResult.length} found`);
    console.log(`   Available: ${slotsResult.filter(s => s.available).length}`);
    console.log(`   Unavailable: ${slotsResult.filter(s => !s.available).length}`);
    
    // Test schedule generation
    const scheduleResult = await provider.generateSchedule({
      adjusterLocation: {
        latitude: 37.7749,
        longitude: -122.4194
      },
      appointments: [
        {
          id: 'apt-1',
          location: {
            latitude: 37.4224764,
            longitude: -122.0842499,
            address: '1600 Amphitheatre Parkway, Mountain View, CA'
          },
          duration: 60,
          priority: 8
        },
        {
          id: 'apt-2',
          location: {
            latitude: 37.3382082,
            longitude: -121.8863286,
            address: 'San Jose, CA'
          },
          duration: 45,
          priority: 6
        }
      ],
      dateRange: {
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-19T23:59:59Z'
      },
      workingHours: {
        start: '09:00',
        end: '17:00',
        days: [1, 2, 3, 4, 5] // Monday to Friday
      }
    });
    
    console.log(`✅ Schedule generation: ${scheduleResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (scheduleResult.schedule) {
      console.log(`   Scheduled appointments: ${scheduleResult.schedule.length}`);
      console.log(`   Total travel time: ${scheduleResult.metrics?.totalTravelTime} min`);
      console.log(`   Utilization rate: ${scheduleResult.metrics?.utilizationRate}`);
    }
    
    return scheduleResult.success;
  } catch (error) {
    console.error('❌ Scheduler provider test failed:', error.message);
    return false;
  }
}

async function testProviderRegistry() {
  console.log('🧪 Testing Provider Registry...');
  
  try {
    // Test getting available providers
    const holidayProviders = getAvailableHolidayProviders();
    const timezoneProviders = getAvailableTimezoneProviders();
    const schedulerProviders = getAvailableSchedulerProviders();
    
    console.log(`✅ Holiday providers available: ${holidayProviders.join(', ')}`);
    console.log(`✅ Timezone providers available: ${timezoneProviders.join(', ')}`);
    console.log(`✅ Scheduler providers available: ${schedulerProviders.join(', ')}`);
    
    // Test invalid providers
    try {
      createHolidayProvider('invalid-holiday');
      console.error('❌ Should have thrown error for invalid holiday provider');
      return false;
    } catch (error) {
      console.log('✅ Correctly rejected invalid holiday provider');
    }
    
    try {
      createTimezoneProvider('invalid-timezone');
      console.error('❌ Should have thrown error for invalid timezone provider');
      return false;
    } catch (error) {
      console.log('✅ Correctly rejected invalid timezone provider');
    }
    
    try {
      createSchedulerProvider('invalid-scheduler');
      console.error('❌ Should have thrown error for invalid scheduler provider');
      return false;
    } catch (error) {
      console.log('✅ Correctly rejected invalid scheduler provider');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Provider registry test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Running Enhanced Scheduler Service Provider Smoke Tests');
  console.log(`🔧 DRY_RUN: ${process.env.DRY_RUN === '1' ? 'ENABLED' : 'DISABLED'}`);
  console.log('');

  const tests = [
    testProviderInitialization,
    testHolidayProvider,
    testTimezoneProvider,
    testSchedulerProvider,
    testProviderRegistry
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const success = await test();
    if (success) {
      passed++;
    } else {
      failed++;
    }
    console.log('');
  }

  console.log('📊 Smoke Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n💡 Some providers may need configuration or real API keys');
    process.exit(1);
  } else {
    console.log('\n🎉 All smoke tests passed!');
    process.exit(0);
  }
}

main().catch(console.error);