// Client-side API functions for AI scheduler endpoints

export interface SchedulingSuggestion {
  suggestedStart: string;
  suggestedEnd: string; 
  confidence: number;
  reasoning: string;
  geographicCluster: {
    nearbyAppointments: string[];
    totalTravelTime: number;
    travelRoute: Array<{
      from: string;
      to: string;
      duration: number;
      distance: number;
    }>;
  };
  conflicts: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  alternatives: Array<{
    start: string;
    end: string;
    reasoning: string;
    confidence: number;
  }>;
}

export interface ScheduleRequest {
  claimId: string;
  adjusterId: string;
  targetDate?: string;
  preferredTimes?: string[];
  estimatedDuration?: number;
}

export interface ConflictAnalysisRequest {
  proposedStart: string;
  proposedEnd: string;
  proposedLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  adjusterId: string;
}

export interface RouteOptimizationRequest {
  appointmentIds: string[];
  adjusterId: string;
  startingLocation?: {
    lat: number;
    lng: number;
  };
}

export async function generateAISchedulingSuggestions(request: ScheduleRequest): Promise<{
  suggestions: SchedulingSuggestion[];
  metadata: {
    claimNumber: string;
    adjusterName: string;
    existingAppointmentCount: number;
    analysisTimestamp: string;
  };
}> {
  const response = await fetch('/api/proxy/ai-scheduler/suggest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate AI scheduling suggestions');
  }

  return response.json();
}

export async function analyzeScheduleConflicts(request: ConflictAnalysisRequest): Promise<{
  hasConflicts: boolean;
  conflicts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }>;
}> {
  const response = await fetch('/api/proxy/ai-scheduler/analyze-conflicts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze schedule conflicts');
  }

  return response.json();
}

export async function optimizeRoute(request: RouteOptimizationRequest): Promise<{
  optimization: {
    optimizedRoute: Array<{
      appointmentId: string;
      suggestedOrder: number;
      travelFromPrevious: {
        duration: number;
        distance: number;
      };
    }>;
    totalTravelTime: number;
    totalDistance: number;
    timeSavings: number;
  };
  metadata: {
    adjusterId: string;
    appointmentCount: number;
    optimizedAt: string;
  };
}> {
  const response = await fetch('/api/proxy/ai-scheduler/optimize-route', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to optimize route');
  }

  return response.json();
}