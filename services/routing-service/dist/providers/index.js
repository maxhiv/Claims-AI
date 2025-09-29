import { GeoapifyProvider } from './geoapify.js';
import { TrueWayVRPProvider } from './trueway-vrp.js';
// Provider registry
const providers = {
    geocoding: {
        geoapify: () => new GeoapifyProvider()
    },
    routing: {
        geoapify: () => new GeoapifyProvider(),
        trueway: () => new TrueWayVRPProvider()
    }
};
// Provider configuration from environment
export const config = {
    geocoding: process.env.ROUTER_GEOCODING_PROVIDER || 'geoapify',
    routing: process.env.ROUTER_ROUTING_PROVIDER || 'geoapify', // Use Geoapify for route geometry
    weather: process.env.ROUTER_WEATHER_PROVIDER || 'weatherapi',
    traffic: process.env.ROUTER_TRAFFIC_PROVIDER || 'tomtom'
};
// Provider selectors
export function getGeocodingProvider() {
    const providerName = config.geocoding;
    const providerFactory = providers.geocoding[providerName];
    if (!providerFactory) {
        throw new Error(`Unknown geocoding provider: ${providerName}`);
    }
    return providerFactory();
}
export function getRoutingProvider() {
    const providerName = config.routing;
    const providerFactory = providers.routing[providerName];
    if (!providerFactory) {
        throw new Error(`Unknown routing provider: ${providerName}`);
    }
    return providerFactory();
}
// Export provider classes for direct use
export { GeoapifyProvider, TrueWayVRPProvider };
