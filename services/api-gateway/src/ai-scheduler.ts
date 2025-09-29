// AI Scheduler API endpoints
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  generateSchedulingSuggestions,
  analyzeScheduleConflicts,
  optimizeGeographicClustering,
  type AppointmentContext,
  type AdjusterContext,
  type ExistingAppointment,
  type SchedulingSuggestion
} from '../../ai-scheduler/openai-client.js';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface ScheduleRequestBody {
  claimId: string;
  adjusterId: string;
  targetDate?: string;
  preferredTimes?: string[];
  estimatedDuration?: number;
}

interface ConflictAnalysisBody {
  proposedStart: string;
  proposedEnd: string;
  proposedLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  adjusterId: string;
}

interface RouteOptimizationBody {
  appointmentIds: string[];
  adjusterId: string;
  startingLocation?: {
    lat: number;
    lng: number;
  };
}

export function registerAISchedulerRoutes(app: FastifyInstance) {
  // POST /api/ai-scheduler/suggest - Get AI scheduling suggestions
  app.post('/api/ai-scheduler/suggest', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        claimId,
        adjusterId,
        targetDate,
        preferredTimes,
        estimatedDuration
      } = req.body as ScheduleRequestBody;

      // Get claim details
      const claimResult = await pool.query(`
        SELECT 
          c.id, c.claim_number, c.peril, c.sla_due,
          c.insured_name, c.insured_language,
          c.loss_address, c.loss_lat, c.loss_lng
        FROM claims c
        WHERE c.id = $1
      `, [claimId]);

      if (claimResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Claim not found' });
      }

      const claim = claimResult.rows[0];

      // Get adjuster details
      const adjusterResult = await pool.query(`
        SELECT 
          a.id, a.name, a.phone, a.email,
          a.working_hours_start, a.working_hours_end, a.time_zone,
          a.max_appointments_per_day, a.expertise,
          a.current_lat, a.current_lng
        FROM adjusters a
        WHERE a.id = $1
      `, [adjusterId]);

      if (adjusterResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Adjuster not found' });
      }

      const adjusterRow = adjusterResult.rows[0];

      // Get existing appointments for the adjuster
      const appointmentsResult = await pool.query(`
        SELECT 
          a.id, a.start_ts, a.end_ts, a.status,
          a.address, a.lat, a.lng
        FROM appointments a
        JOIN claims c ON a.claim_id = c.id
        WHERE c.adjuster_id = $1
          AND a.start_ts >= NOW()
          AND a.status IN ('confirmed', 'pending')
        ORDER BY a.start_ts
      `, [adjusterId]);

      // Determine priority based on SLA and peril
      const priority = determinePriority(claim.peril, claim.sla_due);

      // Prepare data for AI analysis
      const appointmentToSchedule = {
        claimId: claim.id,
        claimNumber: claim.claim_number,
        peril: claim.peril,
        priority,
        estimatedDuration: estimatedDuration || getEstimatedDuration(claim.peril),
        location: {
          address: claim.loss_address,
          lat: claim.loss_lat,
          lng: claim.loss_lng
        },
        insuredPreferences: {
          preferredTimes: preferredTimes,
          language: claim.insured_language
        },
        slaDue: claim.sla_due ? new Date(claim.sla_due).toISOString() : undefined
      };

      const adjuster = {
        id: adjusterRow.id,
        name: adjusterRow.name,
        workingHours: {
          start: adjusterRow.working_hours_start || '08:00',
          end: adjusterRow.working_hours_end || '17:00'
        },
        timeZone: adjusterRow.time_zone || 'America/Chicago',
        currentLocation: adjusterRow.current_lat && adjusterRow.current_lng ? {
          lat: adjusterRow.current_lat,
          lng: adjusterRow.current_lng
        } : undefined,
        expertise: adjusterRow.expertise ? adjusterRow.expertise.split(',') : [],
        maxAppointmentsPerDay: adjusterRow.max_appointments_per_day || 6
      };

      const existingAppointments: ExistingAppointment[] = appointmentsResult.rows.map(row => ({
        id: row.id,
        start: new Date(row.start_ts).toISOString(),
        end: new Date(row.end_ts).toISOString(),
        location: {
          address: row.address,
          lat: row.lat,
          lng: row.lng
        },
        status: row.status
      }));

      // Generate AI suggestions
      const suggestions = await generateSchedulingSuggestions(
        appointmentToSchedule,
        adjuster,
        existingAppointments,
        targetDate
      );

      return {
        suggestions,
        metadata: {
          claimNumber: claim.claim_number,
          adjusterName: adjuster.name,
          existingAppointmentCount: existingAppointments.length,
          analysisTimestamp: new Date().toISOString()
        }
      };

    } catch (error: unknown) {
      app.log.error(`Error generating AI scheduling suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(500).send({ error: 'Failed to generate suggestions' });
    }
  });

  // POST /api/ai-scheduler/analyze-conflicts - Analyze scheduling conflicts
  app.post('/api/ai-scheduler/analyze-conflicts', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        proposedStart,
        proposedEnd,
        proposedLocation,
        adjusterId
      } = req.body as ConflictAnalysisBody;

      // Get adjuster details
      const adjusterResult = await pool.query(`
        SELECT 
          a.id, a.name, a.working_hours_start, a.working_hours_end,
          a.time_zone, a.max_appointments_per_day
        FROM adjusters a
        WHERE a.id = $1
      `, [adjusterId]);

      if (adjusterResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Adjuster not found' });
      }

      const adjusterRow = adjusterResult.rows[0];

      // Get existing appointments
      const appointmentsResult = await pool.query(`
        SELECT 
          a.id, a.start_ts, a.end_ts, a.status,
          a.address, a.lat, a.lng
        FROM appointments a
        JOIN claims c ON a.claim_id = c.id
        WHERE c.adjuster_id = $1
          AND a.start_ts >= $2::timestamp - interval '1 day'
          AND a.start_ts <= $2::timestamp + interval '1 day'
          AND a.status IN ('confirmed', 'pending')
      `, [adjusterId, proposedStart]);

      const adjuster = {
        id: adjusterRow.id,
        name: adjusterRow.name,
        workingHours: {
          start: adjusterRow.working_hours_start || '08:00',
          end: adjusterRow.working_hours_end || '17:00'
        },
        timeZone: adjusterRow.time_zone || 'America/Chicago',
        expertise: [],
        maxAppointmentsPerDay: adjusterRow.max_appointments_per_day || 6
      };

      const existingAppointments: ExistingAppointment[] = appointmentsResult.rows.map(row => ({
        id: row.id,
        start: new Date(row.start_ts).toISOString(),
        end: new Date(row.end_ts).toISOString(),
        location: {
          address: row.address,
          lat: row.lat,
          lng: row.lng
        },
        status: row.status
      }));

      const analysis = await analyzeScheduleConflicts(
        {
          start: proposedStart,
          end: proposedEnd,
          location: proposedLocation
        },
        existingAppointments,
        adjuster
      );

      return analysis;

    } catch (error: unknown) {
      app.log.error(`Error analyzing schedule conflicts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(500).send({ error: 'Failed to analyze conflicts' });
    }
  });

  // POST /api/ai-scheduler/optimize-route - Optimize geographic routing
  app.post('/api/ai-scheduler/optimize-route', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        appointmentIds,
        adjusterId,
        startingLocation
      } = req.body as RouteOptimizationBody;

      // Get appointment details
      const appointmentsResult = await pool.query(`
        SELECT 
          a.id, a.start_ts, a.end_ts,
          a.address, a.lat, a.lng
        FROM appointments a
        WHERE a.id = ANY($1::uuid[])
        ORDER BY a.start_ts
      `, [appointmentIds]);

      const appointments = appointmentsResult.rows.map(row => ({
        id: row.id,
        start: new Date(row.start_ts).toISOString(),
        end: new Date(row.end_ts).toISOString(),
        location: {
          lat: row.lat,
          lng: row.lng,
          address: row.address
        }
      }));

      const optimization = await optimizeGeographicClustering(
        appointments,
        startingLocation
      );

      return {
        optimization,
        metadata: {
          adjusterId,
          appointmentCount: appointments.length,
          optimizedAt: new Date().toISOString()
        }
      };

    } catch (error: unknown) {
      app.log.error(`Error optimizing route: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return reply.status(500).send({ error: 'Failed to optimize route' });
    }
  });
}

// Helper functions
function determinePriority(peril: string, slaDue?: Date): 'urgent' | 'high' | 'normal' | 'low' {
  if (!slaDue) return 'normal';
  
  const daysUntilSla = Math.ceil((slaDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilSla <= 1) return 'urgent';
  if (daysUntilSla <= 3) return 'high';
  if (daysUntilSla <= 7) return 'normal';
  return 'low';
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
  
  return durations[peril] || 90; // Default to 90 minutes
}