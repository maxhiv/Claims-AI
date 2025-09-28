// Quick integration test for microservice architecture
const BASE_URL = 'http://localhost:8000';

async function testEndpoint(path, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.text();
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch {
      parsedData = data;
    }

    console.log(`\n📋 ${options.method || 'GET'} ${path}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(parsedData, null, 2));
    
    return { status: response.status, data: parsedData };
  } catch (error) {
    console.log(`\n❌ ${options.method || 'GET'} ${path}`);
    console.log(`   Error: ${error.message}`);
    return { error: error.message };
  }
}

async function runIntegrationTests() {
  console.log('🚀 Running Microservice Integration Tests');
  console.log('===============================================');

  // Test 1: Gateway health check
  await testEndpoint('/health');

  // Test 2: Microservices health check
  await testEndpoint('/api/services/health');

  // Test 3: CQ Middleware - Address verification
  await testEndpoint('/api/cq/verify-address', {
    method: 'POST',
    body: {
      address: '1600 Amphitheatre Parkway',
      city: 'Mountain View', 
      state: 'CA'
    }
  });

  // Test 4: CQ Middleware - Address suggestions
  await testEndpoint('/api/cq/suggest-addresses', {
    method: 'POST',
    body: {
      query: '1600 Amphitheatre',
      maxResults: 5
    }
  });

  // Test 5: Scheduler Service - Holidays
  await testEndpoint('/api/scheduler/holidays', {
    method: 'POST',
    body: {
      year: 2024,
      country: 'US'
    }
  });

  // Test 6: Scheduler Service - Timezone
  await testEndpoint('/api/scheduler/timezone', {
    method: 'POST',
    body: {
      latitude: 37.7749,
      longitude: -122.4194
    }
  });

  // Test 7: Communications Service - Language detection
  await testEndpoint('/api/communications/detect-language', {
    method: 'POST',
    body: {
      text: 'Hello, how are you today?'
    }
  });

  // Test 8: Routing Service - Geocoding
  await testEndpoint('/api/routing/geocode', {
    method: 'POST',
    body: {
      address: '1600 Amphitheatre Parkway, Mountain View, CA'
    }
  });

  console.log('\n✅ Integration tests completed!');
}

runIntegrationTests().catch(console.error);