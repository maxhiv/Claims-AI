// AI Scheduling Engine using OpenAI - Based on javascript_openai integration
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AppointmentContext {
  id?: string;
  claimId: string;
  claimNumber: string;
  peril: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  estimatedDuration: number; // minutes
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  insuredPreferences?: {
    preferredTimes?: string[];
    blackoutDates?: string[];
    language?: string;
  };
  slaDue?: string; // ISO date
}

export interface AdjusterContext {
  id: string;
  name: string;
  workingHours: {
    start: string; // "08:00"
    end: string;   // "17:00"
  };
  timeZone: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  expertise: string[];
  maxAppointmentsPerDay: number;
}

export interface ExistingAppointment {
  id: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
}

export interface SchedulingSuggestion {
  suggestedStart: string; // ISO datetime
  suggestedEnd: string;   // ISO datetime
  confidence: number; // 0-1
  reasoning: string;
  geographicCluster: {
    nearbyAppointments: string[]; // appointment IDs
    totalTravelTime: number; // minutes
    travelRoute: Array<{
      from: string;
      to: string;
      duration: number;
      distance: number;
    }>;
  };
  conflicts: Array<{
    type: 'schedule_conflict' | 'sla_risk' | 'travel_time_risk';
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

export async function generateSchedulingSuggestions(
  appointmentToSchedule: AppointmentContext,
  adjuster: AdjusterContext,
  existingAppointments: ExistingAppointment[],
  targetDate?: string
): Promise<SchedulingSuggestion[]> {
  console.log('=== AI Scheduler Debug Start ===');
  console.log('appointmentToSchedule:', appointmentToSchedule);
  console.log('adjuster:', adjuster);
  console.log('existingAppointments:', existingAppointments);
  console.log('targetDate:', targetDate);
  
  try {
    const prompt = `You are an expert AI scheduling assistant for insurance field adjusters. Analyze the following data and provide optimal scheduling suggestions.

TARGET APPOINTMENT TO SCHEDULE:
- Claim: ${appointmentToSchedule.claimNumber} (${appointmentToSchedule.peril})
- Priority: ${appointmentToSchedule.priority}
- Estimated Duration: ${appointmentToSchedule.estimatedDuration} minutes
- Location: ${appointmentToSchedule.location.address} (${appointmentToSchedule.location.lat}, ${appointmentToSchedule.location.lng})
- SLA Due: ${appointmentToSchedule.slaDue || 'Not specified'}
- Preferred Times: ${appointmentToSchedule.insuredPreferences?.preferredTimes?.join(', ') || 'None specified'}

ADJUSTER PROFILE:
- Name: ${adjuster.name}
- Working Hours: ${adjuster.workingHours.start} - ${adjuster.workingHours.end} ${adjuster.timeZone}
- Max Appointments/Day: ${adjuster.maxAppointmentsPerDay}
- Expertise: ${adjuster.expertise.join(', ')}
- Current Location: ${adjuster.currentLocation ? `${adjuster.currentLocation.lat}, ${adjuster.currentLocation.lng}` : 'Not specified'}

EXISTING APPOINTMENTS:
${existingAppointments.map(apt => `
- ${apt.id}: ${apt.start} to ${apt.end} (${apt.status})
  Location: ${apt.location.address} (${apt.location.lat}, ${apt.location.lng})
`).join('')}

TARGET DATE RANGE: ${targetDate || 'Next 7 days'}

INSTRUCTIONS:
1. Suggest 3-5 optimal time slots considering:
   - Geographic clustering to minimize travel time
   - SLA compliance and priority levels
   - Adjuster availability and workload
   - Insured preferences when possible
   - Buffer time between appointments

2. For each suggestion, provide:
   - Exact start/end times (ISO format)
   - Confidence score (0-1)
   - Clear reasoning
   - Geographic clustering analysis
   - Potential conflicts and risks
   - Alternative options

3. Prioritize efficiency, compliance, and customer satisfaction.

Respond with valid JSON matching this structure:
{
  "suggestions": [
    {
      "suggestedStart": "ISO datetime",
      "suggestedEnd": "ISO datetime", 
      "confidence": 0.95,
      "reasoning": "Clear explanation of why this time is optimal",
      "geographicCluster": {
        "nearbyAppointments": ["apt_id1", "apt_id2"],
        "totalTravelTime": 45,
        "travelRoute": [
          {
            "from": "Previous location",
            "to": "Target location", 
            "duration": 25,
            "distance": 15.5
          }
        ]
      },
      "conflicts": [
        {
          "type": "sla_risk",
          "description": "Explanation",
          "severity": "low"
        }
      ],
      "alternatives": [
        {
          "start": "ISO datetime",
          "end": "ISO datetime",
          "reasoning": "Alternative explanation",
          "confidence": 0.85
        }
      ]
    }
  ]
}`;

    console.log('About to call OpenAI API...');
    console.log('Prompt length:', prompt.length);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert AI scheduling assistant for insurance field adjusters. You optimize schedules for efficiency, compliance, and customer satisfaction. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    console.log('OpenAI API call successful');
    console.log('Response:', response.choices[0].message.content);

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    const result = JSON.parse(content);
    return result.suggestions || [];

  } catch (error) {
    console.error('Error generating scheduling suggestions:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(`Failed to generate AI scheduling suggestions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function analyzeScheduleConflicts(
  proposedAppointment: {
    start: string;
    end: string;
    location: { lat: number; lng: number; address: string };
  },
  existingAppointments: ExistingAppointment[],
  adjuster: AdjusterContext
): Promise<{
  hasConflicts: boolean;
  conflicts: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }>;
}> {
  try {
    const prompt = `Analyze potential scheduling conflicts for this proposed appointment.

PROPOSED APPOINTMENT:
- Start: ${proposedAppointment.start}
- End: ${proposedAppointment.end}
- Location: ${proposedAppointment.location.address} (${proposedAppointment.location.lat}, ${proposedAppointment.location.lng})

EXISTING SCHEDULE:
${existingAppointments.map(apt => `
- ${apt.start} to ${apt.end} at ${apt.location.address} (${apt.status})
`).join('')}

ADJUSTER CONSTRAINTS:
- Working Hours: ${adjuster.workingHours.start} - ${adjuster.workingHours.end}
- Max Appointments/Day: ${adjuster.maxAppointmentsPerDay}

Identify conflicts and provide suggestions. Respond with JSON:
{
  "hasConflicts": boolean,
  "conflicts": [
    {
      "type": "time_overlap|travel_time|workload|outside_hours",
      "severity": "low|medium|high",
      "description": "Detailed explanation",
      "suggestion": "How to resolve this conflict"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a scheduling conflict analyzer. Identify issues and provide solutions. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    return JSON.parse(content);

  } catch (error) {
    console.error('Error analyzing schedule conflicts:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to analyze schedule conflicts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function optimizeGeographicClustering(
  appointments: Array<{
    id: string;
    start: string;
    end: string;
    location: { lat: number; lng: number; address: string };
  }>,
  adjusterLocation?: { lat: number; lng: number }
): Promise<{
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
  timeSavings: number; // compared to original order
}> {
  try {
    const prompt = `Optimize the geographic routing for these appointments to minimize travel time.

APPOINTMENTS TO ROUTE:
${appointments.map((apt, index) => `
${index + 1}. ${apt.id}: ${apt.start} to ${apt.end}
   Location: ${apt.location.address} (${apt.location.lat}, ${apt.location.lng})
`).join('')}

ADJUSTER STARTING LOCATION: ${adjusterLocation ? `${adjusterLocation.lat}, ${adjusterLocation.lng}` : 'Use first appointment'}

Calculate optimal route order and provide travel estimates. Respond with JSON:
{
  "optimizedRoute": [
    {
      "appointmentId": "apt_id",
      "suggestedOrder": 1,
      "travelFromPrevious": {
        "duration": 25,
        "distance": 15.5
      }
    }
  ],
  "totalTravelTime": 120,
  "totalDistance": 85.5,
  "timeSavings": 45
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a route optimization expert. Calculate efficient travel routes for field adjusters. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }
    return JSON.parse(content);

  } catch (error) {
    console.error('Error optimizing geographic clustering:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    throw new Error(`Failed to optimize geographic routing: ${error instanceof Error ? error.message : String(error)}`);
  }
}