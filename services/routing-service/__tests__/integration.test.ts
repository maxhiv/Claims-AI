#!/usr/bin/env tsx

// Integration tests to verify API endpoints return expected geometry
// Run with: npm run test:integration

import { getRoutingProvider } from '../src/providers/index.js';

// Set DRY_RUN=0 to test actual API responses (requires real API keys)
process.env.DRY_RUN = process.env.DRY_RUN || '1';

// Test environment
Object.assign(process.env, {
  GEOAPIFY_API_KEY: 'test-geoapify-key',
  TRUEWAY_API_KEY: 'test-trueway-key',
  ROUTER_ROUTING_PROVIDER: 'geoapify'  // Force Geoapify for route geometry
});

async function testRouteGeometry() {
  console.log('🧪 Testing Route Geometry Response...');
  
  try {
    const provider = getRoutingProvider();
    
    const waypoints = [
      { lat: 37.4224764, lng: -122.0842499, name: 'Mountain View' },
      { lat: 37.7749, lng: -122.4194, name: 'San Francisco' }
    ];
    
    const result = await provider.calculateRoute(waypoints);
    
    // Verify geometry fields are present even in DRY_RUN
    const hasPolyline = result.polyline !== undefined && result.polyline !== null;
    const hasSteps = Array.isArray(result.steps) && result.steps.length > 0;
    
    console.log(`✅ Route calculation: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Polyline present: ${hasPolyline}`);
    console.log(`   Steps present: ${hasSteps}`);
    console.log(`   Distance: ${result.distance} km`);
    console.log(`   Duration: ${result.duration} minutes`);
    
    if (process.env.DRY_RUN === '1') {
      console.log('   Mode: DRY_RUN (using mock geometry)');
    }
    
    if (!hasPolyline || !hasSteps) {
      console.error('❌ CRITICAL: Route geometry missing - this breaks map visualization!');
      return false;
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ Route geometry test failed:', error.message);
    return false;
  }
}

async function testOptimizationResponse() {
  console.log('🧪 Testing Route Optimization Response...');
  
  try {
    // Import TrueWay directly for optimization
    const { TrueWayVRPProvider } = await import('../src/providers/index.js');
    const provider = new TrueWayVRPProvider();
    
    const waypoints = [
      { lat: 37.4224764, lng: -122.0842499, name: 'Mountain View' },
      { lat: 37.7749, lng: -122.4194, name: 'San Francisco' },
      { lat: 37.3382082, lng: -121.8863286, name: 'San Jose' }
    ];
    
    const result = await provider.optimizeRoute(waypoints);
    
    const hasOptimizedOrder = Array.isArray(result.optimizedOrder) && result.optimizedOrder.length > 0;
    const hasRoutes = Array.isArray(result.routes) && result.routes.length > 0;
    
    console.log(`✅ Route optimization: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Optimized order present: ${hasOptimizedOrder}`);
    console.log(`   Route segments present: ${hasRoutes}`);
    console.log(`   Total distance: ${result.totalDistance} km`);
    console.log(`   Total duration: ${result.totalDuration} minutes`);
    
    if (process.env.DRY_RUN === '1') {
      console.log('   Mode: DRY_RUN (using mock optimization)');
    }
    
    if (!hasOptimizedOrder) {
      console.error('❌ CRITICAL: Optimized order missing!');
      return false;
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ Route optimization test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Running Routing Service Integration Tests');
  console.log(`🔧 DRY_RUN: ${process.env.DRY_RUN === '1' ? 'ENABLED' : 'DISABLED'}`);
  console.log('');

  const tests = [
    testRouteGeometry,
    testOptimizationResponse
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

  console.log('📊 Integration Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n💡 Tip: Set DRY_RUN=0 and provide real API keys to test actual responses');
    process.exit(1);
  } else {
    console.log('\n🎉 All integration tests passed!');
    process.exit(0);
  }
}

main().catch(console.error);