import Fastify from 'fastify';
import { getGeocodingProvider, getRoutingProvider } from './providers/index.js';
const fastify = Fastify({ logger: true });
// Health check
fastify.get('/health', async () => {
    return { status: 'ok', service: 'routing-service', timestamp: new Date().toISOString() };
});
// Geocoding endpoints
fastify.post('/geocode', async (request, reply) => {
    const { address } = request.body;
    if (!address) {
        return reply.code(400).send({ error: 'Missing required field: address' });
    }
    try {
        const geocodingProvider = getGeocodingProvider();
        const result = await geocodingProvider.geocode(address);
        if (result.success) {
            return {
                success: true,
                lat: result.lat,
                lng: result.lng,
                formattedAddress: result.formattedAddress,
                confidence: result.confidence
            };
        }
        else {
            return reply.code(404).send({ error: result.error });
        }
    }
    catch (error) {
        console.error('Geocoding error:', error);
        return reply.code(500).send({ error: 'Geocoding failed' });
    }
});
fastify.post('/reverse-geocode', async (request, reply) => {
    const { lat, lng } = request.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return reply.code(400).send({ error: 'Missing required fields: lat, lng' });
    }
    try {
        const geocodingProvider = getGeocodingProvider();
        const result = await geocodingProvider.reverseGeocode(lat, lng);
        if (result.success) {
            return {
                success: true,
                address: result.address,
                city: result.city,
                state: result.state,
                country: result.country
            };
        }
        else {
            return reply.code(404).send({ error: result.error });
        }
    }
    catch (error) {
        console.error('Reverse geocoding error:', error);
        return reply.code(500).send({ error: 'Reverse geocoding failed' });
    }
});
// Route calculation
fastify.post('/calculate-route', async (request, reply) => {
    const { waypoints } = request.body;
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
        return reply.code(400).send({ error: 'At least 2 waypoints required' });
    }
    try {
        const routingProvider = getRoutingProvider();
        const result = await routingProvider.calculateRoute(waypoints);
        if (result.success) {
            return {
                success: true,
                distance: result.distance,
                duration: result.duration,
                polyline: result.polyline,
                steps: result.steps
            };
        }
        else {
            return reply.code(500).send({ error: result.error });
        }
    }
    catch (error) {
        console.error('Route calculation error:', error);
        return reply.code(500).send({ error: 'Route calculation failed' });
    }
});
// Route optimization (main feature) - Always use TrueWay for VRP optimization
fastify.post('/optimize', async (request, reply) => {
    const { waypoints, constraints } = request.body;
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
        return reply.code(400).send({ error: 'At least 2 waypoints required for optimization' });
    }
    try {
        // Always use TrueWay for optimization regardless of config
        const { TrueWayVRPProvider } = await import('./providers/index.js');
        const vrpProvider = new TrueWayVRPProvider();
        const result = await vrpProvider.optimizeRoute(waypoints, constraints);
        if (result.success) {
            return {
                success: true,
                optimizedOrder: result.optimizedOrder,
                totalDistance: result.totalDistance,
                totalDuration: result.totalDuration,
                routes: result.routes,
                savings: result.savings
            };
        }
        else {
            return reply.code(500).send({ error: result.error });
        }
    }
    catch (error) {
        console.error('Route optimization error:', error);
        return reply.code(500).send({ error: 'Route optimization failed' });
    }
});
// Batch geocoding for multiple addresses
fastify.post('/batch-geocode', async (request, reply) => {
    const { addresses } = request.body;
    if (!addresses || !Array.isArray(addresses)) {
        return reply.code(400).send({ error: 'Missing required field: addresses (array)' });
    }
    try {
        const geocodingProvider = getGeocodingProvider();
        const results = await Promise.all(addresses.map(address => geocodingProvider.geocode(address)));
        return {
            success: true,
            results: results.map((result, index) => ({
                address: addresses[index],
                ...result
            }))
        };
    }
    catch (error) {
        console.error('Batch geocoding error:', error);
        return reply.code(500).send({ error: 'Batch geocoding failed' });
    }
});
// Start server
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '8099');
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Routing service listening on port ${port}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
