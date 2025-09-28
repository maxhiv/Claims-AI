import Fastify from 'fastify';
import pg from 'pg';
import { randomUUID } from 'crypto';
import { registerMicroserviceRoutes } from './microservice-routes.js';
import { registerCommunicationRoutes } from './communication.js';
import { registerAISchedulerRoutes } from './ai-scheduler.js';

const { Pool } = pg;

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const app = Fastify({ logger: true });

// Enable CORS
await app.register(import('@fastify/cors'), {
  origin: true,
});

app.get('/health', async () => ({ ok: true }));

// GET /api/claims/assignments - fetch claims assigned to an adjuster
app.get('/api/claims/assignments', async (req, reply) => {
  try {
    const { adjusterId, since } = req.query as { adjusterId?: string; since?: string };
    
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
  } catch (error) {
    app.log.error('Error fetching claims assignments:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// GET /api/claims/:claimId/appointments - fetch appointments for a claim
app.get('/api/claims/:claimId/appointments', async (req, reply) => {
  try {
    const { claimId } = req.params as { claimId: string };

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
  } catch (error) {
    app.log.error('Error fetching appointments:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// POST /api/claims/:claimId/appointments - create/update appointments
app.post('/api/claims/:claimId/appointments', async (req, reply) => {
  try {
    const { claimId } = req.params as { claimId: string };
    const body = req.body as any;

    const {
      idempotencyKey,
      start,
      end,
      status,
      location,
      channel,
      messageId,
      notes
    } = body;

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
  } catch (error) {
    app.log.error('Error upserting appointment:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// POST /api/claims/:claimId/communications - log communications
app.post('/api/claims/:claimId/communications', async (req, reply) => {
  try {
    const { claimId } = req.params as { claimId: string };
    const body = req.body as any;

    const {
      kind,
      direction,
      providerId,
      templateKey,
      bodyPreview,
      language,
      consentState,
      userId
    } = body;

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
  } catch (error) {
    app.log.error('Error logging communication:', error);
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

// PATCH /api/claims/:claimId/stage - update claim stage
app.patch('/api/claims/:claimId/stage', async (req, reply) => {
  try {
    const { claimId } = req.params as { claimId: string };
    const body = req.body as any;
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
  } catch (error) {
    app.log.error('Error updating claim stage:', error);
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
