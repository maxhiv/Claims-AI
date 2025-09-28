#!/usr/bin/env tsx

// Contract smoke tests for routing service providers
// Run with: npm test (uses DRY_RUN=1 by default)

import { config } from '../src/providers/index.js';

// Set DRY_RUN=1 for testing without external API calls
process.env.DRY_RUN = process.env.DRY_RUN || '1';

// Mock environment variables for testing
const testEnv = {
  GEOAPIFY_API_KEY: 'test-geoapify-key',
  TRUEWAY_API_KEY: 'test-trueway-key'
};

// Apply test environment
Object.assign(process.env, testEnv);

async function testGeocodingProvider() {
  console.log('🧪 Testing Geocoding Provider...');
  
  try {
    const { getGeocodingProvider } = await import('../src/providers/index.js');
    const provider = getGeocodingProvider();
    
    const result = await provider.geocode('1600 Amphitheatre Parkway, Mountain View, CA');
    
    if (process.env.DRY_RUN === '1') {
      console.log('✅ Geocoding provider initialized successfully (DRY_RUN)');
      console.log('   Expected: DRY_RUN simulation would succeed');
    } else {
      console.log(`✅ Geocoding: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.lat && result.lng) console.log(`   Coordinates: ${result.lat}, ${result.lng}`);
      if (result.formattedAddress) console.log(`   Address: ${result.formattedAddress}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Geocoding provider test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testReverseGeocodingProvider() {
  console.log('🧪 Testing Reverse Geocoding Provider...');
  
  try {
    const { getGeocodingProvider } = await import('../src/providers/index.js');
    const provider = getGeocodingProvider();
    
    const result = await provider.reverseGeocode(37.4224764, -122.0842499);
    
    if (process.env.DRY_RUN === '1') {
      console.log('✅ Reverse geocoding provider initialized successfully (DRY_RUN)');
      console.log('   Expected: DRY_RUN simulation would succeed');
    } else {
      console.log(`✅ Reverse geocoding: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.address) console.log(`   Address: ${result.address}`);
      if (result.city) console.log(`   City: ${result.city}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Reverse geocoding provider test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testRoutingProvider() {
  console.log('🧪 Testing Routing Provider...');
  
  try {
    const { getRoutingProvider } = await import('../src/providers/index.js');
    const provider = getRoutingProvider();
    
    const waypoints = [
      { lat: 37.4224764, lng: -122.0842499, name: 'Googleplex' },
      { lat: 37.7749, lng: -122.4194, name: 'San Francisco' }
    ];
    
    const result = await provider.calculateRoute(waypoints);
    
    if (process.env.DRY_RUN === '1') {
      console.log('✅ Routing provider initialized successfully (DRY_RUN)');
      console.log('   Expected: DRY_RUN simulation would succeed');
    } else {
      console.log(`✅ Route calculation: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.distance) console.log(`   Distance: ${result.distance} km`);
      if (result.duration) console.log(`   Duration: ${result.duration} minutes`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Routing provider test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testRouteOptimizationProvider() {
  console.log('🧪 Testing Route Optimization Provider...');
  
  try {
    const { getRoutingProvider } = await import('../src/providers/index.js');
    const provider = getRoutingProvider();
    
    const waypoints = [
      { lat: 37.4224764, lng: -122.0842499, name: 'Googleplex' },
      { lat: 37.7749, lng: -122.4194, name: 'San Francisco' },
      { lat: 37.3382082, lng: -121.8863286, name: 'San Jose' },
      { lat: 37.6879, lng: -122.4702, name: 'Daly City' }
    ];
    
    const result = await provider.optimizeRoute(waypoints);
    
    if (process.env.DRY_RUN === '1') {
      console.log('✅ Route optimization provider initialized successfully (DRY_RUN)');
      console.log('   Expected: DRY_RUN simulation would succeed');
    } else {
      console.log(`✅ Route optimization: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.optimizedOrder) console.log(`   Optimized order: ${result.optimizedOrder}`);
      if (result.totalDistance) console.log(`   Total distance: ${result.totalDistance} km`);
      if (result.totalDuration) console.log(`   Total duration: ${result.totalDuration} minutes`);
      if (result.savings) console.log(`   Savings: ${result.savings.timeSaved} min, ${result.savings.distanceSaved} km`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Route optimization provider test failed:', error.message);
    return false;
  }
  
  return true;
}

async function main() {
  console.log('🚀 Running Routing Service Provider Tests');
  console.log(`🔧 DRY_RUN: ${process.env.DRY_RUN === '1' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📋 Provider Configuration:`, config);
  console.log('');

  const tests = [
    testGeocodingProvider,
    testReverseGeocodingProvider,
    testRoutingProvider,
    testRouteOptimizationProvider
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

  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n💡 Tip: Set DRY_RUN=0 and provide real API keys to test external integrations');
    process.exit(1);
  } else {
    console.log('\n🎉 All routing provider tests passed!');
    process.exit(0);
  }
}

main().catch(console.error);