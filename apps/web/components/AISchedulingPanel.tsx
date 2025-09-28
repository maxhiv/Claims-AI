'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Route,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Brain,
  Navigation
} from 'lucide-react';

interface SchedulingSuggestion {
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

interface ClaimData {
  id: string;
  claimNumber: string;
  insuredName: string;
  address: string;
  peril: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  adjusterId: string;
  lossLocation?: {
    address: string;
    lat: number;
    lng: number;
  };
}

interface AISchedulingPanelProps {
  claim: ClaimData;
  onScheduleAppointment?: (suggestion: SchedulingSuggestion) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export function AISchedulingPanel({ 
  claim, 
  onScheduleAppointment,
  onRefresh 
}: AISchedulingPanelProps) {
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState<number | null>(null);
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState('');

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/proxy/ai-scheduler/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: claim.id,
          adjusterId: claim.adjusterId, // Use the actual adjuster assigned to this claim
          targetDate: targetDate || undefined,
          preferredTimes: preferredTimes.length > 0 ? preferredTimes : undefined,
          estimatedDuration: getEstimatedDuration(claim.peril)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async (suggestion: SchedulingSuggestion, index: number) => {
    setScheduling(index);
    try {
      // Create the appointment using the existing appointment creation endpoint
      const response = await fetch(`/api/proxy/claims/${claim.id}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: `ai-suggestion-${Date.now()}-${index}`,
          start: suggestion.suggestedStart,
          end: suggestion.suggestedEnd,
          status: 'confirmed',
          location: {
            address: claim.lossLocation?.address || claim.address,
            lat: claim.lossLocation?.lat || 0,
            lng: claim.lossLocation?.lng || 0
          },
          channel: 'ai_scheduler',
          notes: `AI Scheduled: ${suggestion.reasoning} (${Math.round(suggestion.confidence * 100)}% confidence)`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create appointment');
      }

      // Call the optional callback for additional handling
      if (onScheduleAppointment) {
        await onScheduleAppointment(suggestion);
      }
      
      if (onRefresh) await onRefresh();

      // Clear suggestions after successful scheduling
      setSuggestions([]);
      
    } catch (error) {
      console.error('Failed to schedule appointment:', error);
      alert('Failed to schedule appointment. Please try again.');
    } finally {
      setScheduling(null);
    }
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    };
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'bg-red-100 text-red-800';
    if (severity === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'urgent') return 'bg-red-100 text-red-800';
    if (priority === 'high') return 'bg-orange-100 text-orange-800';
    if (priority === 'normal') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          AI Scheduling Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Claim Info */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">{claim.claimNumber} - {claim.insuredName}</h4>
            <Badge className={getPriorityColor(claim.priority)}>
              {claim.priority.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{claim.peril} • {claim.address}</p>
        </div>

        {/* Preferences */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Scheduling Preferences</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Preferred Times</label>
              <select
                multiple
                value={preferredTimes}
                onChange={(e) => setPreferredTimes(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-2 py-1 border rounded text-sm"
                size={3}
              >
                <option value="morning">Morning (8-12)</option>
                <option value="afternoon">Afternoon (12-17)</option>
                <option value="evening">Evening (17-20)</option>
              </select>
            </div>
          </div>
          
          <Button
            onClick={handleGenerateSuggestions}
            disabled={loading}
            className="w-full flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate AI Suggestions
              </>
            )}
          </Button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">AI Recommendations</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {suggestions.map((suggestion, index) => {
                const { date, time } = formatDateTime(suggestion.suggestedStart);
                const endTime = formatDateTime(suggestion.suggestedEnd).time;
                
                return (
                  <div key={index} className="border rounded-lg p-3 bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">{date}</span>
                          <Clock className="h-4 w-4 text-gray-600" />
                          <span className="text-sm">{time} - {endTime}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                            {Math.round(suggestion.confidence * 100)}% Confidence
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSchedule(suggestion, index)}
                        disabled={scheduling === index}
                        className="ml-2"
                      >
                        {scheduling === index ? 'Scheduling...' : 'Schedule'}
                      </Button>
                    </div>

                    <p className="text-xs text-gray-700 mb-2">{suggestion.reasoning}</p>

                    {/* Geographic Clustering */}
                    {suggestion.geographicCluster.nearbyAppointments.length > 0 && (
                      <div className="bg-green-50 p-2 rounded text-xs mb-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Route className="h-3 w-3 text-green-600" />
                          <span className="font-medium text-green-800">Route Optimization</span>
                        </div>
                        <p className="text-green-700">
                          Clusters with {suggestion.geographicCluster.nearbyAppointments.length} nearby appointments
                          • {suggestion.geographicCluster.totalTravelTime}min total travel
                        </p>
                      </div>
                    )}

                    {/* Conflicts */}
                    {suggestion.conflicts.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {suggestion.conflicts.map((conflict, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5" />
                            <div className="flex-1">
                              <Badge className={`text-xs ${getSeverityColor(conflict.severity)}`}>
                                {conflict.severity.toUpperCase()}
                              </Badge>
                              <span className="ml-2 text-gray-700">{conflict.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Alternatives */}
                    {suggestion.alternatives.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          {suggestion.alternatives.length} Alternative Times
                        </summary>
                        <div className="mt-1 space-y-1 pl-4">
                          {suggestion.alternatives.map((alt, i) => {
                            const altTime = formatDateTime(alt.start);
                            return (
                              <div key={i} className="text-gray-600">
                                {altTime.date} {altTime.time} ({Math.round(alt.confidence * 100)}%)
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {suggestions.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Click "Generate AI Suggestions" to get intelligent scheduling recommendations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getEstimatedDuration(peril: string): number {
  const durations: { [key: string]: number } = {
    'Wind/Hail': 90,
    'Water Damage': 120,
    'Fire': 150,
    'Theft/Vandalism': 60,
    'Vehicle Impact': 75,
    'Lightning': 45
  };
  
  return durations[peril] || 90;
}