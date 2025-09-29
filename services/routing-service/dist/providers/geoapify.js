import { requestJSON, generateIdempotencyKey } from './http.js';
export class GeoapifyProvider {
    apiKey;
    baseUrl = 'https://api.geoapify.com/v1';
    constructor() {
        this.apiKey = process.env.GEOAPIFY_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('GEOAPIFY_API_KEY environment variable is required');
        }
    }
    async geocode(address) {
        const url = `${this.baseUrl}/geocode/search?text=${encodeURIComponent(address)}&apiKey=${this.apiKey}`;
        try {
            const response = await requestJSON(url);
            if (response.statusCode === 200 && response.body.features?.length > 0) {
                const feature = response.body.features[0];
                const coords = feature.geometry.coordinates;
                return {
                    success: true,
                    lat: coords[1],
                    lng: coords[0],
                    formattedAddress: feature.properties.formatted,
                    confidence: feature.properties.confidence || 1.0
                };
            }
            return {
                success: false,
                error: 'No geocoding results found'
            };
        }
        catch (error) {
            console.error('Geoapify geocoding error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Geocoding failed'
            };
        }
    }
    async reverseGeocode(lat, lng) {
        const url = `${this.baseUrl}/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${this.apiKey}`;
        try {
            const response = await requestJSON(url);
            if (response.statusCode === 200 && response.body.features?.length > 0) {
                const props = response.body.features[0].properties;
                return {
                    success: true,
                    address: props.formatted,
                    city: props.city,
                    state: props.state,
                    country: props.country
                };
            }
            return {
                success: false,
                error: 'No reverse geocoding results found'
            };
        }
        catch (error) {
            console.error('Geoapify reverse geocoding error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Reverse geocoding failed'
            };
        }
    }
    async calculateRoute(waypoints) {
        if (waypoints.length < 2) {
            return { success: false, error: 'At least 2 waypoints required' };
        }
        // Build waypoints string: "lng1,lat1|lng2,lat2|..."
        const waypointsStr = waypoints
            .map(wp => `${wp.lng},${wp.lat}`)
            .join('|');
        const url = `${this.baseUrl}/routing?waypoints=${waypointsStr}&mode=drive&apiKey=${this.apiKey}`;
        try {
            const response = await requestJSON(url, {
                idempotencyKey: generateIdempotencyKey({ waypoints })
            });
            if (response.statusCode === 200 && response.body.features?.length > 0) {
                const route = response.body.features[0];
                const props = route.properties;
                return {
                    success: true,
                    distance: props.distance / 1000, // Convert meters to km
                    duration: props.time / 60, // Convert seconds to minutes
                    polyline: route.geometry.coordinates,
                    steps: props.legs?.[0]?.steps?.map((step) => ({
                        instruction: step.instruction.text,
                        distance: step.distance / 1000,
                        duration: step.time / 60,
                        startLocation: { lat: step.from_location[1], lng: step.from_location[0] },
                        endLocation: { lat: step.to_location[1], lng: step.to_location[0] }
                    })) || []
                };
            }
            return {
                success: false,
                error: 'No routing results found'
            };
        }
        catch (error) {
            console.error('Geoapify routing error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Route calculation failed'
            };
        }
    }
    async optimizeRoute(waypoints) {
        // Geoapify doesn't have built-in route optimization
        // This is a simple implementation - for production, use TrueWay VRP
        if (waypoints.length < 3) {
            const route = await this.calculateRoute(waypoints);
            return {
                success: route.success,
                optimizedOrder: waypoints.map((_, i) => i),
                totalDistance: route.distance,
                totalDuration: route.duration,
                error: route.error
            };
        }
        // Simple nearest neighbor optimization for demonstration
        const optimized = this.nearestNeighborOptimization(waypoints);
        const route = await this.calculateRoute(optimized.waypoints);
        return {
            success: route.success,
            optimizedOrder: optimized.order,
            totalDistance: route.distance,
            totalDuration: route.duration,
            savings: {
                distanceSaved: 0, // Would need original route to calculate
                timeSaved: 0
            },
            error: route.error
        };
    }
    nearestNeighborOptimization(waypoints) {
        if (waypoints.length <= 2) {
            return { waypoints, order: waypoints.map((_, i) => i) };
        }
        const visited = new Set();
        const optimizedOrder = [];
        const optimizedWaypoints = [];
        // Start with first waypoint
        let currentIndex = 0;
        visited.add(currentIndex);
        optimizedOrder.push(currentIndex);
        optimizedWaypoints.push(waypoints[currentIndex]);
        // Find nearest unvisited waypoint each time
        while (optimizedWaypoints.length < waypoints.length) {
            let nearestIndex = -1;
            let nearestDistance = Infinity;
            for (let i = 0; i < waypoints.length; i++) {
                if (visited.has(i))
                    continue;
                const distance = this.calculateDistance(waypoints[currentIndex], waypoints[i]);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = i;
                }
            }
            if (nearestIndex !== -1) {
                visited.add(nearestIndex);
                optimizedOrder.push(nearestIndex);
                optimizedWaypoints.push(waypoints[nearestIndex]);
                currentIndex = nearestIndex;
            }
        }
        return { waypoints: optimizedWaypoints, order: optimizedOrder };
    }
    calculateDistance(wp1, wp2) {
        // Haversine distance formula
        const R = 6371; // Earth's radius in km
        const dLat = (wp2.lat - wp1.lat) * Math.PI / 180;
        const dLng = (wp2.lng - wp1.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(wp1.lat * Math.PI / 180) * Math.cos(wp2.lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
