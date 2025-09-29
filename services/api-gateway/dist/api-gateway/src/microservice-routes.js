// Microservice proxy routes for the API gateway
import { commsService, routingService, cqService, schedulerService } from './service-client.js';
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
export function registerMicroserviceRoutes(app) {
    // === COMMUNICATIONS SERVICE PROXIES ===
    // POST /api/communications/send-email - Enhanced email with microservice
    app.post('/api/communications/send-email', async (req, reply) => {
        try {
            const { type, appointmentId, fromEmail } = req.body;
            // Get appointment and claim details (keep existing database logic)
            const result = await pool.query(`
        SELECT 
          a.id, a.start_ts, a.end_ts, a.address,
          c.claim_number, c.policy_number, c.insured_name, c.insured_email,
          adj.name as adjuster_name, adj.phone as adjuster_phone
        FROM appointments a
        JOIN claims c ON a.claim_id = c.id
        LEFT JOIN adjusters adj ON c.adjuster_id = adj.id
        WHERE a.id = $1
      `, [appointmentId]);
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Appointment not found' });
            }
            const row = result.rows[0];
            if (!row.insured_email) {
                return reply.status(400).send({ error: 'No email address for insured' });
            }
            // Format email content
            const emailContent = formatAppointmentEmail(type, row);
            // Call communications microservice
            const response = await commsService.sendEmail({
                to: row.insured_email,
                subject: emailContent.subject,
                content: emailContent.text
            });
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            // Log the communication
            await pool.query(`
        INSERT INTO communications (
          id, claim_id, kind, direction, body_preview, 
          language, timestamp, provider_id
        ) VALUES (
          gen_random_uuid(), (SELECT claim_id FROM appointments WHERE id = $1), 
          $2, 'outbound', $3, 'en', NOW(), $4
        )
      `, [appointmentId, `${type}_email`, `sent: ${type} email to ${row.insured_email}`, 'comms_service']);
            return { status: 'sent', message: `${type} email sent successfully` };
        }
        catch (error) {
            app.log.error(`Error sending email via microservice: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // POST /api/communications/send-sms - New SMS capability
    app.post('/api/communications/send-sms', async (req, reply) => {
        try {
            const { appointmentId, message, to } = req.body;
            const response = await commsService.sendSMS({
                to,
                message
            });
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            // Log the communication
            await pool.query(`
        INSERT INTO communications (
          id, claim_id, kind, direction, body_preview, 
          language, timestamp, provider_id
        ) VALUES (
          gen_random_uuid(), (SELECT claim_id FROM appointments WHERE id = $1), 
          'sms', 'outbound', $2, 'en', NOW(), 'comms_service'
        )
      `, [appointmentId, `SMS sent to ${to}`]);
            return { status: 'sent', messageId: response.data?.messageId };
        }
        catch (error) {
            app.log.error(`Error sending SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // POST /api/communications/detect-language - Language detection
    app.post('/api/communications/detect-language', async (req, reply) => {
        try {
            const { text } = req.body;
            const response = await commsService.detectLanguage({ text });
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            return response.data;
        }
        catch (error) {
            app.log.error(`Error detecting language: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // === ROUTING SERVICE PROXIES ===
    // POST /api/routing/geocode - Address geocoding
    app.post('/api/routing/geocode', async (req, reply) => {
        try {
            const response = await routingService.geocode(req.body);
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            return response.data;
        }
        catch (error) {
            app.log.error(`Error geocoding address: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // POST /api/routing/optimize - Route optimization (replace stub)
    app.post('/api/routing/optimize', async (req, reply) => {
        try {
            const response = await routingService.optimizeRoute(req.body);
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            return response.data;
        }
        catch (error) {
            app.log.error(`Error optimizing route: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // POST /api/routing/calculate-route - Route calculation
    app.post('/api/routing/calculate-route', async (req, reply) => {
        try {
            const response = await routingService.calculateRoute(req.body);
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            return response.data;
        }
        catch (error) {
            app.log.error(`Error calculating route: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // === CQ MIDDLEWARE PROXIES ===
    // POST /api/cq/verify-address - Address verification
    app.post('/api/cq/verify-address', async (req, reply) => {
        try {
            const response = await cqService.verifyAddress(req.body);
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            return response.data;
        }
        catch (error) {
            app.log.error(`Error verifying address: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // POST /api/cq/suggest-addresses - Address suggestions
    app.post('/api/cq/suggest-addresses', async (req, reply) => {
        try {
            const response = await cqService.suggestAddresses(req.body);
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            return response.data;
        }
        catch (error) {
            app.log.error(`Error getting address suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // === ENHANCED SCHEDULER PROXIES ===
    // POST /api/scheduler/generate-schedule - AI-powered scheduling
    app.post('/api/scheduler/generate-schedule', async (req, reply) => {
        try {
            const response = await schedulerService.generateSchedule(req.body);
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            return response.data;
        }
        catch (error) {
            app.log.error(`Error generating schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // POST /api/scheduler/available-slots - Find available slots
    app.post('/api/scheduler/available-slots', async (req, reply) => {
        try {
            const response = await schedulerService.findAvailableSlots(req.body);
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            return response.data;
        }
        catch (error) {
            app.log.error(`Error finding available slots: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // POST /api/scheduler/holidays - Get holidays
    app.post('/api/scheduler/holidays', async (req, reply) => {
        try {
            const response = await schedulerService.getHolidays(req.body);
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            return response.data;
        }
        catch (error) {
            app.log.error(`Error getting holidays: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // POST /api/scheduler/timezone - Get timezone information
    app.post('/api/scheduler/timezone', async (req, reply) => {
        try {
            const response = await schedulerService.getTimezone(req.body);
            if (!response.success) {
                return reply.status(500).send({ error: response.error });
            }
            return response.data;
        }
        catch (error) {
            app.log.error(`Error getting timezone: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
    // GET /api/services/health - Check all microservice health
    app.get('/api/services/health', async (req, reply) => {
        try {
            const [comms, routing, cq, scheduler] = await Promise.allSettled([
                commsService.getHealth(),
                routingService.getHealth(),
                cqService.getHealth(),
                schedulerService.getHealth()
            ]);
            const healthStatus = {
                gateway: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    communications: comms.status === 'fulfilled' && comms.value.success ? 'healthy' : 'unhealthy',
                    routing: routing.status === 'fulfilled' && routing.value.success ? 'healthy' : 'unhealthy',
                    cq: cq.status === 'fulfilled' && cq.value.success ? 'healthy' : 'unhealthy',
                    scheduler: scheduler.status === 'fulfilled' && scheduler.value.success ? 'healthy' : 'unhealthy'
                }
            };
            const anyUnhealthy = Object.values(healthStatus.services).some(status => status === 'unhealthy');
            return reply.status(anyUnhealthy ? 503 : 200).send(healthStatus);
        }
        catch (error) {
            app.log.error(`Error checking service health: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return reply.status(500).send({ error: 'Health check failed' });
        }
    });
}
// Helper function to format appointment emails
function formatAppointmentEmail(type, appointmentData) {
    const date = new Date(appointmentData.start_ts).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const time = new Date(appointmentData.start_ts).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    const templates = {
        confirmation: {
            subject: `Appointment Confirmation - Claim ${appointmentData.claim_number}`,
            text: `Hello ${appointmentData.insured_name},\n\nYour inspection appointment has been confirmed for ${date} at ${time}.\n\nLocation: ${appointmentData.address}\nClaim Number: ${appointmentData.claim_number}\nAdjuster: ${appointmentData.adjuster_name}\n\nPlease be available at the scheduled time. If you need to reschedule, please contact us.\n\nThank you.`,
            html: `<p>Hello ${appointmentData.insured_name},</p><p>Your inspection appointment has been confirmed for <strong>${date} at ${time}</strong>.</p><p><strong>Location:</strong> ${appointmentData.address}<br><strong>Claim Number:</strong> ${appointmentData.claim_number}<br><strong>Adjuster:</strong> ${appointmentData.adjuster_name}</p><p>Please be available at the scheduled time. If you need to reschedule, please contact us.</p><p>Thank you.</p>`
        },
        reminder: {
            subject: `Appointment Reminder - Claim ${appointmentData.claim_number}`,
            text: `Hello ${appointmentData.insured_name},\n\nThis is a reminder that your inspection appointment is scheduled for ${date} at ${time}.\n\nLocation: ${appointmentData.address}\nClaim Number: ${appointmentData.claim_number}\nAdjuster: ${appointmentData.adjuster_name}\n\nPlease be available at the scheduled time.\n\nThank you.`,
            html: `<p>Hello ${appointmentData.insured_name},</p><p>This is a reminder that your inspection appointment is scheduled for <strong>${date} at ${time}</strong>.</p><p><strong>Location:</strong> ${appointmentData.address}<br><strong>Claim Number:</strong> ${appointmentData.claim_number}<br><strong>Adjuster:</strong> ${appointmentData.adjuster_name}</p><p>Please be available at the scheduled time.</p><p>Thank you.</p>`
        },
        cancellation: {
            subject: `Appointment Cancelled - Claim ${appointmentData.claim_number}`,
            text: `Hello ${appointmentData.insured_name},\n\nYour inspection appointment scheduled for ${date} at ${time} has been cancelled.\n\nClaim Number: ${appointmentData.claim_number}\n\nWe will contact you to reschedule. If you have any questions, please contact us.\n\nThank you.`,
            html: `<p>Hello ${appointmentData.insured_name},</p><p>Your inspection appointment scheduled for <strong>${date} at ${time}</strong> has been cancelled.</p><p><strong>Claim Number:</strong> ${appointmentData.claim_number}</p><p>We will contact you to reschedule. If you have any questions, please contact us.</p><p>Thank you.</p>`
        }
    };
    return templates[type] || templates.confirmation;
}
