import Fastify from 'fastify';
import pg from 'pg';
import { randomUUID } from 'crypto';
import { registerMicroserviceRoutes } from './microservice-routes.js';
const { Pool } = pg;
// Initialize PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
// Helper function to trigger scheduler service for new high-priority claims
async function triggerSchedulerForClaim(claim) {
    const schedulerUrl = process.env.SCHEDULER_SERVICE_URL || 'http://localhost:6800';
    // Create a scheduling request for the new claim
    const schedulingRequest = {
        adjusterId: claim.adjuster_id,
        appointments: [{
                id: `new-${claim.id}`,
                claimId: claim.id,
                priority: Math.floor(claim.priority_score / 10) || 5, // Convert 1-100 to 1-10 scale
                duration: claim.severity_level === 'critical' ? 180 : claim.severity_level === 'urgent' ? 120 : 60, // minutes
                location: {
                    address: claim.loss_address || 'Unknown Location',
                    latitude: claim.loss_lat || 30.6, // Default to Alabama coordinates
                    longitude: claim.loss_lng || -87.9
                },
                constraints: {
                    earliestStart: claim.best_contact_time_from || '09:00',
                    latestEnd: claim.best_contact_time_to || '17:00'
                }
            }],
        dateRange: {
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + (claim.severity_level === 'critical' ? 2 : 7) * 24 * 60 * 60 * 1000).toISOString() // 2 days for critical, 7 for others
        },
        adjusterLocation: {
            latitude: 30.6, // Default location - in production would come from adjuster data
            longitude: -87.9
        },
        workingHours: {
            start: '09:00',
            end: '17:00',
            days: [1, 2, 3, 4, 5] // Mon-Fri
        }
    };
    // Call scheduler service
    const response = await fetch(`${schedulerUrl}/generate-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedulingRequest)
    });
    if (!response.ok) {
        throw new Error(`Scheduler service error: ${response.statusText}`);
    }
    const schedulingResult = await response.json();
    // If scheduling was successful, create actual appointment records
    if (schedulingResult.success && schedulingResult.optimizedSchedule?.length > 0) {
        const appointmentData = schedulingResult.optimizedSchedule[0]; // First scheduled slot
        // Create appointment in database
        await pool.query(`
      INSERT INTO appointments (
        id, claim_id, start_ts, end_ts, status, address, lat, lng, 
        notes, idempotency_key, version, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'proposed', $4, $5, $6, 
        $7, gen_random_uuid()::text, 1, NOW(), NOW()
      )
    `, [
            claim.id,
            appointmentData.scheduledTime.startTime,
            appointmentData.scheduledTime.endTime,
            claim.loss_address,
            claim.loss_lat,
            claim.loss_lng,
            `Auto-scheduled based on ${claim.severity_level} priority (score: ${claim.priority_score}). Travel time: ${appointmentData.estimatedTravelTime}min`
        ]);
        console.log(`Created auto-scheduled appointment for ${claim.severity_level} priority claim ${claim.claim_number}`);
    }
}
const app = Fastify({ logger: true });
// Enable CORS
await app.register(import('@fastify/cors'), {
    origin: true,
});
app.get('/health', async () => ({ ok: true }));
// GET /api/claims/assignments - fetch claims assigned to an adjuster
app.get('/api/claims/assignments', async (req, reply) => {
    try {
        const { adjusterId, since } = req.query;
        if (!adjusterId) {
            return reply.status(400).send({ error: 'adjusterId parameter is required' });
        }
        let query = `
      SELECT 
        c.id, c.claim_number, c.policy_number, c.carrier, c.peril,
        c.insured_name, c.insured_phone, c.insured_email, c.insured_language,
        c.loss_address, c.loss_lat, c.loss_lng, c.sla_due,
        c.adjuster_id, c.stage, c.created_at, c.updated_at
      FROM claims c 
      WHERE c.adjuster_id = $1
    `;
        const params = [adjusterId];
        if (since) {
            query += ' AND c.updated_at >= $2';
            params.push(since);
        }
        query += ' ORDER BY c.updated_at DESC';
        const result = await pool.query(query, params);
        const claims = result.rows.map(row => ({
            id: row.id,
            claimNumber: row.claim_number,
            policyNumber: row.policy_number,
            carrier: row.carrier,
            insured: {
                name: row.insured_name,
                phone: row.insured_phone,
                email: row.insured_email,
                language: row.insured_language
            },
            lossLocation: {
                address: row.loss_address,
                lat: row.loss_lat,
                lng: row.loss_lng
            },
            peril: row.peril,
            slaDue: row.sla_due?.toISOString(),
            adjusterId: row.adjuster_id,
            stage: row.stage
        }));
        return { claims };
    }
    catch (error) {
        app.log.error(`Error fetching claims assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({ error: 'Internal server error' });
    }
});
// GET /api/claims/:claimId/appointments - fetch appointments for a claim
app.get('/api/claims/:claimId/appointments', async (req, reply) => {
    try {
        const { claimId } = req.params;
        const result = await pool.query(`
      SELECT 
        a.id, a.claim_id, a.start_ts, a.end_ts, a.status,
        a.address, a.lat, a.lng, a.channel, a.message_id,
        a.notes, a.idempotency_key, a.version, a.created_at, a.updated_at
      FROM appointments a
      WHERE a.claim_id = $1
      ORDER BY a.start_ts ASC
    `, [claimId]);
        const appointments = result.rows.map(row => ({
            id: row.id,
            claimId: row.claim_id,
            start: row.start_ts.toISOString(),
            end: row.end_ts.toISOString(),
            status: row.status,
            location: {
                address: row.address,
                lat: row.lat,
                lng: row.lng
            },
            channel: row.channel,
            messageId: row.message_id,
            notes: row.notes,
            idempotencyKey: row.idempotency_key,
            version: row.version
        }));
        return { appointments };
    }
    catch (error) {
        app.log.error(`Error fetching appointments: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({ error: 'Internal server error' });
    }
});
// POST /api/claims - Create new enhanced claim
app.post('/api/claims', async (req, reply) => {
    try {
        const claimData = req.body;
        // Generate claim ID
        const claimId = claimData.id || null; // Let database generate if not provided
        // Insert enhanced claim with all property loss form fields
        const result = await pool.query(`
      INSERT INTO claims (
        id, claim_number, policy_number, policy_name, policy_effective_date, policy_expiration_date,
        carrier, federal_id_number, peril, incident_date, incident_time, date_insured_notified,
        date_reported, incident_state, occurred_on_premises, location_inspected_immediately,
        photos_taken, mortgage_on_property, incident_description, cause_of_loss, cause_of_loss_other,
        category_of_loss, category_of_loss_other, damage_description, damage_estimate,
        authorities_contacted, police_contacted, police_authority_name, police_report_number,
        police_violations, fire_contacted, fire_authority_name, fire_report_number, fire_violations,
        other_authority_contacted, other_authority_name, other_authority_phone, suspect_apprehended,
        insured_name, insured_phone, insured_email, insured_language, insured_cell_number,
        insured_fax, drivers_license_number, drivers_license_state, license_plate_number,
        license_plate_state, is_cargo_owner, best_contact_time_from, best_contact_time_to,
        best_contact_days, preferred_contact_method, loss_address, loss_address_2, loss_city,
        loss_state, loss_zip, loss_county, loss_country, loss_lat, loss_lng,
        mailing_same_as_loss, mailing_address, mailing_address_2, mailing_city, mailing_state,
        mailing_zip, mailing_county, mailing_country, business_location, location_code_l1,
        location_code_l2, location_code_l3, location_code_l4, location_code_l5, location_code_l6,
        reported_by_first_name, reported_by_last_name, reporter_job_title, reporter_phone,
        reporter_email, is_reporter_contact, severity_level, priority_score, requires_immediate_response,
        adjuster_id, stage, sla_due, is_notice_only, additional_comments
      ) VALUES (
        COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, 
        $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, 
        $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, 
        $69, $70, $71, $72, $73, $74, $75, $76, $77, $78, $79, $80, $81, $82, $83, $84
      ) RETURNING *
    `, [
            claimId, claimData.claim_number, claimData.policy_number, claimData.policy_name,
            claimData.policy_effective_date, claimData.policy_expiration_date, claimData.carrier,
            claimData.federal_id_number, claimData.peril, claimData.incident_date, claimData.incident_time,
            claimData.date_insured_notified, claimData.date_reported, claimData.incident_state,
            claimData.occurred_on_premises, claimData.location_inspected_immediately, claimData.photos_taken,
            claimData.mortgage_on_property, claimData.incident_description, claimData.cause_of_loss,
            claimData.cause_of_loss_other, claimData.category_of_loss, claimData.category_of_loss_other,
            claimData.damage_description, claimData.damage_estimate, claimData.authorities_contacted,
            claimData.police_contacted, claimData.police_authority_name, claimData.police_report_number,
            claimData.police_violations, claimData.fire_contacted, claimData.fire_authority_name,
            claimData.fire_report_number, claimData.fire_violations, claimData.other_authority_contacted,
            claimData.other_authority_name, claimData.other_authority_phone, claimData.suspect_apprehended,
            claimData.insured_name, claimData.insured_phone, claimData.insured_email, claimData.insured_language,
            claimData.insured_cell_number, claimData.insured_fax, claimData.drivers_license_number,
            claimData.drivers_license_state, claimData.license_plate_number, claimData.license_plate_state,
            claimData.is_cargo_owner, claimData.best_contact_time_from, claimData.best_contact_time_to,
            claimData.best_contact_days, claimData.preferred_contact_method, claimData.loss_address,
            claimData.loss_address_2, claimData.loss_city, claimData.loss_state, claimData.loss_zip,
            claimData.loss_county, claimData.loss_country, claimData.loss_lat, claimData.loss_lng,
            claimData.mailing_same_as_loss, claimData.mailing_address, claimData.mailing_address_2,
            claimData.mailing_city, claimData.mailing_state, claimData.mailing_zip, claimData.mailing_county,
            claimData.mailing_country, claimData.business_location, claimData.location_code_l1,
            claimData.location_code_l2, claimData.location_code_l3, claimData.location_code_l4,
            claimData.location_code_l5, claimData.location_code_l6, claimData.reported_by_first_name,
            claimData.reported_by_last_name, claimData.reporter_job_title, claimData.reporter_phone,
            claimData.reporter_email, claimData.is_reporter_contact, claimData.severity_level,
            claimData.priority_score, claimData.requires_immediate_response, claimData.adjuster_id,
            claimData.stage, claimData.sla_due, claimData.is_notice_only, claimData.additional_comments
        ]);
        if (result.rows.length === 0) {
            return reply.status(500).send({ error: 'Failed to create claim' });
        }
        const newClaim = result.rows[0];
        // Format response
        const claim = {
            id: newClaim.id,
            claimNumber: newClaim.claim_number,
            policyNumber: newClaim.policy_number,
            carrier: newClaim.carrier,
            severityLevel: newClaim.severity_level,
            priorityScore: newClaim.priority_score,
            requiresImmediateResponse: newClaim.requires_immediate_response,
            insured: {
                name: newClaim.insured_name,
                phone: newClaim.insured_phone,
                email: newClaim.insured_email,
                language: newClaim.insured_language
            },
            lossLocation: {
                address: newClaim.loss_address,
                city: newClaim.loss_city,
                state: newClaim.loss_state,
                zip: newClaim.loss_zip,
                lat: newClaim.loss_lat,
                lng: newClaim.loss_lng
            },
            peril: newClaim.peril,
            incidentDate: newClaim.incident_date?.toISOString(),
            damageEstimate: newClaim.damage_estimate,
            authoritiesContacted: newClaim.authorities_contacted,
            adjusterId: newClaim.adjuster_id,
            stage: newClaim.stage,
            slaDue: newClaim.sla_due?.toISOString(),
            createdAt: newClaim.created_at?.toISOString(),
            updatedAt: newClaim.updated_at?.toISOString()
        };
        // Trigger AI-driven scheduling for high-priority claims
        app.log.info(`Processing claim with severity: ${newClaim.severity_level}, priority: ${newClaim.priority_score}, immediate response: ${newClaim.requires_immediate_response}`);
        if (newClaim.requires_immediate_response || (newClaim.priority_score && newClaim.priority_score >= 70)) {
            app.log.info(`Triggering scheduler for high-priority claim: ${newClaim.claim_number}`);
            try {
                await triggerSchedulerForClaim(newClaim);
                app.log.info(`Successfully triggered scheduler for claim: ${newClaim.claim_number}`);
            }
            catch (schedError) {
                app.log.error(`Failed to trigger scheduler for claim: ${schedError instanceof Error ? schedError.message : 'Unknown error'}`);
                // Don't fail claim creation if scheduler fails, but log the error
            }
        }
        else {
            app.log.info(`Claim ${newClaim.claim_number} does not meet high-priority criteria - no automatic scheduling triggered`);
        }
        return { success: true, claim };
    }
    catch (error) {
        app.log.error(`Error creating claim: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});
// POST /api/claims/:claimId/appointments - create/update appointments
app.post('/api/claims/:claimId/appointments', async (req, reply) => {
    try {
        const { claimId } = req.params;
        const body = req.body;
        const { idempotencyKey, start, end, status, location, channel, messageId, notes } = body;
        const appointmentId = randomUUID();
        const now = new Date().toISOString();
        // Check if appointment with this idempotency key already exists
        if (idempotencyKey) {
            const existing = await pool.query(`
        SELECT id FROM appointments WHERE idempotency_key = $1
      `, [idempotencyKey]);
            if (existing.rows.length > 0) {
                return { status: 'upserted', id: existing.rows[0].id };
            }
        }
        const result = await pool.query(`
      INSERT INTO appointments (
        id, claim_id, start_ts, end_ts, status, address, lat, lng,
        channel, message_id, notes, idempotency_key, version, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
            appointmentId,
            claimId,
            start,
            end,
            status,
            location?.address,
            location?.lat,
            location?.lng,
            channel,
            messageId,
            notes,
            idempotencyKey,
            1,
            now,
            now
        ]);
        return { status: 'upserted', id: result.rows[0].id };
    }
    catch (error) {
        app.log.error(`Error upserting appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({ error: 'Internal server error' });
    }
});
// POST /api/claims/:claimId/communications - log communications
app.post('/api/claims/:claimId/communications', async (req, reply) => {
    try {
        const { claimId } = req.params;
        const body = req.body;
        const { kind, direction, providerId, templateKey, bodyPreview, language, consentState, userId } = body;
        const communicationId = randomUUID();
        await pool.query(`
      INSERT INTO communications (
        id, claim_id, kind, direction, provider_id, template_key,
        body_preview, language, consent_state, user_id, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
            communicationId,
            claimId,
            kind,
            direction,
            providerId,
            templateKey,
            bodyPreview,
            language,
            consentState,
            userId,
            new Date().toISOString()
        ]);
        return { status: 'accepted', id: communicationId };
    }
    catch (error) {
        app.log.error(`Error logging communication: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({ error: 'Internal server error' });
    }
});
// PATCH /api/claims/:claimId/stage - update claim stage
app.patch('/api/claims/:claimId/stage', async (req, reply) => {
    try {
        const { claimId } = req.params;
        const body = req.body;
        const { stage } = body;
        if (!stage) {
            return reply.status(400).send({ error: 'stage parameter is required' });
        }
        await pool.query(`
      UPDATE claims 
      SET stage = $1, updated_at = $2
      WHERE id = $3
    `, [stage, new Date().toISOString(), claimId]);
        return { status: 'updated' };
    }
    catch (error) {
        app.log.error(`Error updating claim stage: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return reply.status(500).send({ error: 'Internal server error' });
    }
});
// Register microservice proxy routes (new architecture)
registerMicroserviceRoutes(app);
// Note: Legacy routes removed to avoid conflicts - microservices now handle these endpoints
// Legacy communication and AI scheduler functionality now handled by microservices
const port = Number(process.env.PORT || 8000);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
    app.log.error(err);
    process.exit(1);
});
