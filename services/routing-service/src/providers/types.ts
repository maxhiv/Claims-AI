export interface GeocodingProvider {
  geocode(address: string): Promise<GeocodingResult>;
  reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult>;
}

export interface RoutingProvider {
  calculateRoute(waypoints: RouteWaypoint[]): Promise<RouteResult>;
  optimizeRoute(waypoints: RouteWaypoint[], constraints?: RouteConstraints): Promise<OptimizedRouteResult>;
}

export interface WeatherProvider {
  getForecast(lat: number, lng: number, date: string): Promise<WeatherResult>;
}

export interface TrafficProvider {
  getIncidents(bounds: GeoBounds): Promise<TrafficIncidentResult>;
}

// Input types
export interface RouteWaypoint {
  id?: string;
  address?: string;
  lat: number;
  lng: number;
  name?: string;
  timeWindow?: {
    start: string; // ISO timestamp
    end: string;   // ISO timestamp
  };
  serviceTime?: number; // minutes
}

export interface RouteConstraints {
  maxTotalTime?: number; // minutes
  maxDistance?: number;  // kilometers
  startLocation?: RouteWaypoint;
  endLocation?: RouteWaypoint;
  vehicleCapacity?: number;
  workingHours?: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Result types
export interface GeocodingResult {
  success: boolean;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  confidence?: number;
  error?: string;
}

export interface ReverseGeocodingResult {
  success: boolean;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  error?: string;
}

export interface RouteResult {
  success: boolean;
  distance?: number; // kilometers
  duration?: number; // minutes
  polyline?: string;
  steps?: RouteStep[];
  error?: string;
}

export interface OptimizedRouteResult {
  success: boolean;
  optimizedOrder?: number[]; // indices of original waypoints
  totalDistance?: number;    // kilometers
  totalDuration?: number;    // minutes
  routes?: RouteSegment[];
  savings?: {
    distanceSaved: number;
    timeSaved: number;
  };
  error?: string;
}

export interface WeatherResult {
  success: boolean;
  condition?: string;
  temperature?: number;
  precipitation?: number;
  windSpeed?: number;
  visibility?: number;
  error?: string;
}

export interface TrafficIncidentResult {
  success: boolean;
  incidents?: TrafficIncident[];
  error?: string;
}

// Supporting types
export interface RouteStep {
  instruction: string;
  distance: number; // kilometers
  duration: number; // minutes
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
}

export interface RouteSegment {
  fromWaypointIndex: number;
  toWaypointIndex: number;
  distance: number; // kilometers
  duration: number; // minutes
  polyline?: string;
}

export interface TrafficIncident {
  id: string;
  type: 'accident' | 'construction' | 'closure' | 'congestion';
  severity: 'low' | 'medium' | 'high';
  location: { lat: number; lng: number };
  description: string;
  delay?: number; // minutes
}

// Configuration
export interface ProviderConfig {
  geocoding: string;
  routing: string;
  weather: string;
  traffic: string;
}