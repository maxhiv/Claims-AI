import { requestJSON, generateIdempotencyKey } from './http.js';
export class TrueWayVRPProvider {
    apiKey;
    baseUrl = 'https://api.trueway-api.com/v1';
    constructor() {
        this.apiKey = process.env.TRUEWAY_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('TRUEWAY_API_KEY environment variable is required');
        }
    }
    async calculateRoute(waypoints) {
        // TrueWay focuses on optimization, basic routing via Matrix API
        const locations = waypoints.map(wp => `${wp.lat},${wp.lng}`).join(';');
        const url = `${this.baseUrl}/Matrix?origins=${locations}&destinations=${locations}&key=${this.apiKey}`;
        try {
            const response = await requestJSON(url);
            if (response.statusCode === 200) {
                const matrix = response.body;
                const totalDistance = matrix.distances?.[0]?.reduce((sum, dist) => sum + dist, 0) / 1000 || 0;
                const totalDuration = matrix.durations?.[0]?.reduce((sum, dur) => sum + dur, 0) / 60 || 0;
                return {
                    success: true,
                    distance: totalDistance,
                    duration: totalDuration
                };
            }
            return {
                success: false,
                error: 'Matrix calculation failed'
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Route calculation failed'
            };
        }
    }
    async optimizeRoute(waypoints, constraints) {
        if (waypoints.length < 2) {
            return { success: false, error: 'At least 2 waypoints required for optimization' };
        }
        const payload = {
            locations: waypoints.map(wp => ({
                id: wp.id || `wp_${waypoints.indexOf(wp)}`,
                lat: wp.lat,
                lng: wp.lng,
                name: wp.name || wp.address || `Waypoint ${waypoints.indexOf(wp)}`,
                time_window: wp.timeWindow ? {
                    start: wp.timeWindow.start,
                    end: wp.timeWindow.end
                } : undefined,
                service_time: wp.serviceTime || 15 // Default 15 minutes
            })),
            vehicles: [{
                    id: 'vehicle_1',
                    start_location: constraints?.startLocation ? {
                        lat: constraints.startLocation.lat,
                        lng: constraints.startLocation.lng
                    } : {
                        lat: waypoints[0].lat,
                        lng: waypoints[0].lng
                    },
                    end_location: constraints?.endLocation ? {
                        lat: constraints.endLocation.lat,
                        lng: constraints.endLocation.lng
                    } : {
                        lat: waypoints[0].lat,
                        lng: waypoints[0].lng
                    },
                    capacity: constraints?.vehicleCapacity || 100,
                    working_hours: constraints?.workingHours || {
                        start: '09:00',
                        end: '17:00'
                    }
                }],
            optimization_mode: 'time', // or 'distance'
            traffic: true
        };
        const url = `${this.baseUrl}/vrp?key=${this.apiKey}`;
        try {
            const response = await requestJSON(url, {
                body: JSON.stringify(payload),
                idempotencyKey: generateIdempotencyKey(payload)
            });
            if (response.statusCode === 200 && response.body.routes?.length > 0) {
                const route = response.body.routes[0];
                // Extract optimized order from the route
                const optimizedOrder = route.stops.map((stop) => {
                    return waypoints.findIndex(wp => wp.lat === stop.location.lat && wp.lng === stop.location.lng);
                }).filter((index) => index !== -1);
                return {
                    success: true,
                    optimizedOrder,
                    totalDistance: route.distance / 1000, // Convert to km
                    totalDuration: route.duration / 60, // Convert to minutes
                    routes: route.legs?.map((leg, index) => ({
                        fromWaypointIndex: optimizedOrder[index] || 0,
                        toWaypointIndex: optimizedOrder[index + 1] || optimizedOrder.length - 1,
                        distance: leg.distance / 1000,
                        duration: leg.duration / 60,
                        polyline: leg.polyline
                    })) || [],
                    savings: {
                        distanceSaved: response.body.optimization_stats?.distance_saved / 1000 || 0,
                        timeSaved: response.body.optimization_stats?.time_saved / 60 || 0
                    }
                };
            }
            return {
                success: false,
                error: response.body.error || 'VRP optimization failed'
            };
        }
        catch (error) {
            console.error('TrueWay VRP error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'VRP optimization failed'
            };
        }
    }
    async calculateMatrix(locations) {
        const locationsStr = locations.map(wp => `${wp.lat},${wp.lng}`).join(';');
        const url = `${this.baseUrl}/Matrix?origins=${locationsStr}&destinations=${locationsStr}&key=${this.apiKey}`;
        try {
            const response = await requestJSON(url, {
                idempotencyKey: generateIdempotencyKey({ locations })
            });
            if (response.statusCode === 200) {
                return {
                    success: true,
                    distances: response.body.distances, // 2D array in meters
                    durations: response.body.durations // 2D array in seconds
                };
            }
            return {
                success: false,
                error: response.body.error || 'Matrix calculation failed'
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Matrix calculation failed'
            };
        }
    }
}
