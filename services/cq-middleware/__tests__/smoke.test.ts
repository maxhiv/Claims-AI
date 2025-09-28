#!/usr/bin/env tsx

// Smoke tests for CQ middleware providers
// Run with: npm test

import { initializeProviders, getAvailableProviders, createProvider } from '../src/providers/index.js';

// Set up test environment
process.env.DRY_RUN = '1';
process.env.SMARTY_AUTH_ID = 'test-smarty-id';
process.env.SMARTY_AUTH_TOKEN = 'test-smarty-token';
process.env.LOQATE_API_KEY = 'test-loqate-key';

async function testProviderInitialization() {
  console.log('🧪 Testing Provider Initialization...');
  
  try {
    const providers = await initializeProviders();
    const availableProviders = getAvailableProviders();
    
    console.log(`✅ Available providers: ${availableProviders.join(', ')}`);
    
    for (const [name, initialized] of providers) {
      console.log(`   ${initialized ? '✅' : '❌'} ${name}: ${initialized ? 'OK' : 'FAILED'}`);
    }
    
    const allInitialized = Array.from(providers.values()).every(Boolean);
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

async function testSmartyProvider() {
  console.log('🧪 Testing Smarty Provider...');
  
  try {
    const provider = createProvider('smarty');
    
    // Test address verification
    const verifyResult = await provider.verifyAddress({
      address: '1600 Amphitheatre Parkway',
      city: 'Mountain View',
      state: 'CA',
      postalCode: '94043'
    });
    
    console.log(`✅ Smarty verification: ${verifyResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Deliverable: ${verifyResult.deliverable}`);
    console.log(`   Confidence: ${verifyResult.confidence}`);
    
    // Test suggestions
    const suggestResult = await provider.getSuggestions({
      query: '1600 Amphitheatre',
      maxResults: 5
    });
    
    console.log(`✅ Smarty suggestions: ${suggestResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Suggestions count: ${suggestResult.suggestions.length}`);
    
    return verifyResult.success && suggestResult.success;
  } catch (error) {
    console.error('❌ Smarty provider test failed:', error.message);
    return false;
  }
}

async function testLoqateProvider() {
  console.log('🧪 Testing Loqate Provider...');
  
  try {
    const provider = createProvider('loqate');
    
    // Test address verification
    const verifyResult = await provider.verifyAddress({
      address: '1600 Amphitheatre Parkway',
      city: 'Mountain View',
      state: 'CA',
      postalCode: '94043'
    });
    
    console.log(`✅ Loqate verification: ${verifyResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Deliverable: ${verifyResult.deliverable}`);
    console.log(`   Confidence: ${verifyResult.confidence}`);
    
    // Test suggestions
    const suggestResult = await provider.getSuggestions({
      query: '1600 Amphitheatre',
      maxResults: 5
    });
    
    console.log(`✅ Loqate suggestions: ${suggestResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Suggestions count: ${suggestResult.suggestions.length}`);
    
    return verifyResult.success && suggestResult.success;
  } catch (error) {
    console.error('❌ Loqate provider test failed:', error.message);
    return false;
  }
}

async function testProviderRegistry() {
  console.log('🧪 Testing Provider Registry...');
  
  try {
    // Test creating each provider
    const smarty = createProvider('smarty');
    const loqate = createProvider('loqate');
    
    console.log(`✅ Created providers: ${smarty.name}, ${loqate.name}`);
    
    // Test invalid provider
    try {
      createProvider('invalid-provider');
      console.error('❌ Should have thrown error for invalid provider');
      return false;
    } catch (error) {
      console.log('✅ Correctly rejected invalid provider');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Provider registry test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Running CQ Middleware Provider Smoke Tests');
  console.log(`🔧 DRY_RUN: ${process.env.DRY_RUN === '1' ? 'ENABLED' : 'DISABLED'}`);
  console.log('');

  const tests = [
    testProviderInitialization,
    testSmartyProvider,
    testLoqateProvider,
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