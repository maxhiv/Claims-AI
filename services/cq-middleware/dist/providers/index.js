// Address verification provider registry
import { SmartyProvider } from './smarty.js';
import { LoqateProvider } from './loqate.js';
// Export provider implementations
export { SmartyProvider } from './smarty.js';
export { LoqateProvider } from './loqate.js';
// Provider registry
const providerRegistry = new Map([
    ['smarty', () => new SmartyProvider()],
    ['loqate', () => new LoqateProvider()]
]);
export function getAvailableProviders() {
    return Array.from(providerRegistry.keys());
}
export function createProvider(providerName) {
    const factory = providerRegistry.get(providerName);
    if (!factory) {
        throw new Error(`Unknown address verification provider: ${providerName}. Available: ${getAvailableProviders().join(', ')}`);
    }
    return factory();
}
/**
 * Get the default address verification provider based on environment
 */
export function getAddressProvider() {
    const providerName = process.env.CQ_ADDRESS_PROVIDER || 'smarty';
    return createProvider(providerName);
}
/**
 * Initialize all providers (useful for health checks)
 */
export async function initializeProviders() {
    const results = new Map();
    for (const providerName of getAvailableProviders()) {
        try {
            const provider = createProvider(providerName);
            // Simple initialization check
            results.set(providerName, !!provider.name);
        }
        catch (error) {
            console.error(`Failed to initialize provider ${providerName}:`, error);
            results.set(providerName, false);
        }
    }
    return results;
}
