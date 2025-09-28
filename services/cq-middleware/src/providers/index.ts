// Address verification provider registry

import type { AddressVerificationProvider } from './types.js';
import { SmartyProvider } from './smarty.js';
import { LoqateProvider } from './loqate.js';

// Export all provider types
export type { 
  AddressVerificationProvider,
  AddressVerificationRequest,
  AddressVerificationResponse,
  AddressSuggestionsRequest,
  AddressSuggestionsResponse
} from './types.js';

// Export provider implementations
export { SmartyProvider } from './smarty.js';
export { LoqateProvider } from './loqate.js';

// Provider registry
const providerRegistry = new Map<string, () => AddressVerificationProvider>([
  ['smarty', () => new SmartyProvider()],
  ['loqate', () => new LoqateProvider()]
]);

export function getAvailableProviders(): string[] {
  return Array.from(providerRegistry.keys());
}

export function createProvider(providerName: string): AddressVerificationProvider {
  const factory = providerRegistry.get(providerName);
  
  if (!factory) {
    throw new Error(`Unknown address verification provider: ${providerName}. Available: ${getAvailableProviders().join(', ')}`);
  }
  
  return factory();
}

/**
 * Get the default address verification provider based on environment
 */
export function getAddressProvider(): AddressVerificationProvider {
  const providerName = process.env.CQ_ADDRESS_PROVIDER || 'smarty';
  return createProvider(providerName);
}

/**
 * Initialize all providers (useful for health checks)
 */
export async function initializeProviders(): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  
  for (const providerName of getAvailableProviders()) {
    try {
      const provider = createProvider(providerName);
      // Simple initialization check
      results.set(providerName, !!provider.name);
    } catch (error) {
      console.error(`Failed to initialize provider ${providerName}:`, error);
      results.set(providerName, false);
    }
  }
  
  return results;
}