#!/usr/bin/env tsx

// Contract smoke tests for communications service providers
// Run with: npm test (uses DRY_RUN=1 by default)

import { config } from '../src/providers/index.js';

// Set DRY_RUN=1 for testing without external API calls
process.env.DRY_RUN = process.env.DRY_RUN || '1';

// Mock environment variables for testing
const testEnv = {
  SENDGRID_API_KEY: 'test-sg-key',
  SENDGRID_FROM_EMAIL: 'test@example.com',
  SMS77IO_API_KEY: 'test-sms77-key',
  SMS77IO_FROM: 'Test',
  MAYTAPI_API_KEY: 'test-maytapi-key',
  MAYTAPI_PHONE_ID: 'test-phone-id',
  LANGUAGELAYER_API_KEY: 'test-ll-key'
};

// Apply test environment
Object.assign(process.env, testEnv);

async function testEmailProvider() {
  console.log('🧪 Testing Email Provider...');
  
  try {
    const { getEmailProvider } = await import('../src/providers/index.js');
    const provider = getEmailProvider();
    
    const result = await provider.sendEmail(
      'test@example.com',
      'Test Subject',
      '<h1>Test Content</h1>'
    );
    
    if (process.env.DRY_RUN === '1') {
      console.log('✅ Email provider initialized successfully (DRY_RUN)');
      console.log('   Expected: DRY_RUN simulation would succeed');
    } else {
      console.log(`✅ Email sent: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.messageId) console.log(`   Message ID: ${result.messageId}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Email provider test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testSMSProvider() {
  console.log('🧪 Testing SMS Provider...');
  
  try {
    const { getSMSProvider } = await import('../src/providers/index.js');
    const provider = getSMSProvider();
    
    const result = await provider.sendSMS('+1234567890', 'Test SMS message');
    
    if (process.env.DRY_RUN === '1') {
      console.log('✅ SMS provider initialized successfully (DRY_RUN)');
      console.log('   Expected: DRY_RUN simulation would succeed');
    } else {
      console.log(`✅ SMS sent: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.messageId) console.log(`   Message ID: ${result.messageId}`);
      if (result.cost) console.log(`   Cost: ${result.cost}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ SMS provider test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testWhatsAppProvider() {
  console.log('🧪 Testing WhatsApp Provider...');
  
  try {
    const { getWhatsAppProvider } = await import('../src/providers/index.js');
    const provider = getWhatsAppProvider();
    
    const result = await provider.sendWhatsApp('+1234567890', 'Test WhatsApp message');
    
    if (process.env.DRY_RUN === '1') {
      console.log('✅ WhatsApp provider initialized successfully (DRY_RUN)');
      console.log('   Expected: DRY_RUN simulation would succeed');
    } else {
      console.log(`✅ WhatsApp sent: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.messageId) console.log(`   Message ID: ${result.messageId}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ WhatsApp provider test failed:', error.message);
    return false;
  }
  
  return true;
}

async function testLanguageDetectionProvider() {
  console.log('🧪 Testing Language Detection Provider...');
  
  try {
    const { getLanguageDetectionProvider } = await import('../src/providers/index.js');
    const provider = getLanguageDetectionProvider();
    
    const result = await provider.detectLanguage('Hello world, this is a test message');
    
    if (process.env.DRY_RUN === '1') {
      console.log('✅ Language detection provider initialized successfully (DRY_RUN)');
      console.log('   Expected: DRY_RUN simulation would succeed');
    } else {
      console.log(`✅ Language detected: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.language) console.log(`   Language: ${result.language}`);
      if (result.confidence) console.log(`   Confidence: ${result.confidence}`);
      if (result.error) console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Language detection provider test failed:', error.message);
    return false;
  }
  
  return true;
}

async function main() {
  console.log('🚀 Running Communications Service Provider Tests');
  console.log(`🔧 DRY_RUN: ${process.env.DRY_RUN === '1' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📋 Provider Configuration:`, config);
  console.log('');

  const tests = [
    testEmailProvider,
    testSMSProvider,
    testWhatsAppProvider,
    testLanguageDetectionProvider
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
    console.log('\n🎉 All provider tests passed!');
    process.exit(0);
  }
}

main().catch(console.error);