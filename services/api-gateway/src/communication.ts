// Communication endpoints for appointment notifications
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sendAppointmentEmail, AppointmentEmailData } from '../../communication/sendgrid';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface SendEmailRequest {
  type: 'confirmation' | 'reminder' | 'cancellation';
  appointmentId: string;
  fromEmail?: string;
}

interface LogCommunicationRequest {
  appointmentId: string;
  channel: 'email' | 'sms';
  messageType: 'confirmation' | 'reminder' | 'cancellation';
  recipient: string;
  status: 'sent' | 'failed';
  messageId?: string;
  errorMessage?: string;
}

export function registerCommunicationRoutes(app: FastifyInstance) {
  // POST /api/communications/send-email - Send appointment email
  app.post('/api/communications/send-email', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { type, appointmentId, fromEmail } = req.body as SendEmailRequest;

      // Get appointment and claim details
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

      const appointmentData: AppointmentEmailData = {
        adjusterId: '', // Will be filled from session/context
        adjusterName: row.adjuster_name || 'Your Adjuster',
        adjusterPhone: row.adjuster_phone || 'Contact office',
        claimNumber: row.claim_number,
        policyNumber: row.policy_number || 'N/A',
        insuredName: row.insured_name,
        appointmentDate: new Date(row.start_ts).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        appointmentTime: new Date(row.start_ts).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        }),
        address: row.address,
        estimatedDuration: '1-2 hours'
      };

      const success = await sendAppointmentEmail(
        type,
        row.insured_email,
        appointmentData,
        fromEmail || 'noreply@adjusterscheduler.com'
      );

      // Log the communication attempt
      await pool.query(`
        INSERT INTO communications (
          id, claim_id, kind, direction, body_preview, 
          language, timestamp, provider_id
        ) VALUES (
          gen_random_uuid(), (SELECT claim_id FROM appointments WHERE id = $1), 
          $2, 'outbound', $3, 'en', NOW(), $4
        )
      `, [appointmentId, `${type}_email`, `${success ? 'sent' : 'failed'}: ${type} email to ${row.insured_email}`, success ? 'sendgrid_success' : 'sendgrid_failed']);

      if (success) {
        return { status: 'sent', message: `${type} email sent successfully` };
      } else {
        return reply.status(500).send({ error: 'Failed to send email' });
      }

    } catch (error) {
      app.log.error('Error sending email:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/communications/log - Log communication attempt
  app.post('/api/communications/log', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const {
        appointmentId,
        channel,
        messageType,
        recipient
      } = req.body as LogCommunicationRequest;

      await pool.query(`
        INSERT INTO communications (
          id, claim_id, kind, direction, body_preview,
          language, timestamp, provider_id
        ) VALUES (
          gen_random_uuid(), (SELECT claim_id FROM appointments WHERE id = $1), 
          $2, 'outbound', $3, 'en', NOW(), 'manual_log'
        )
      `, [appointmentId, `${messageType}_${channel}`, `${messageType} ${channel} to ${recipient}`]);

      return { status: 'logged' };

    } catch (error) {
      app.log.error('Error logging communication:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/communications/history/:appointmentId - Get communication history
  app.get('/api/communications/history/:appointmentId', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { appointmentId } = req.params as { appointmentId: string };

      const result = await pool.query(`
        SELECT 
          c.id, c.kind, c.direction, c.body_preview, c.timestamp
        FROM communications c
        JOIN appointments a ON c.claim_id = a.claim_id
        WHERE a.id = $1
        ORDER BY c.timestamp DESC
      `, [appointmentId]);

      const communications = result.rows.map(row => ({
        id: row.id,
        kind: row.kind,
        direction: row.direction,
        bodyPreview: row.body_preview,
        timestamp: row.timestamp.toISOString()
      }));

      return { communications };

    } catch (error) {
      app.log.error('Error fetching communication history:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/communications/send-reminders - Send reminder emails for upcoming appointments
  app.post('/api/communications/send-reminders', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      // Find appointments scheduled for tomorrow that haven't received reminders
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const result = await pool.query(`
        SELECT DISTINCT
          a.id, a.start_ts, a.address,
          c.claim_number, c.policy_number, c.insured_name, c.insured_email,
          adj.name as adjuster_name, adj.phone as adjuster_phone
        FROM appointments a
        JOIN claims c ON a.claim_id = c.id
        LEFT JOIN adjusters adj ON c.adjuster_id = adj.id
        WHERE a.start_ts >= $1 
          AND a.start_ts < $2
          AND a.status = 'confirmed'
          AND c.insured_email IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM communications com 
            WHERE com.claim_id = a.claim_id 
              AND com.kind = 'reminder_email'
              AND com.direction = 'outbound'
          )
      `, [tomorrow.toISOString(), dayAfterTomorrow.toISOString()]);

      const remindersSent = [];
      const remindersSkipped = [];

      for (const row of result.rows) {
        try {
          const appointmentData: AppointmentEmailData = {
            adjusterId: '',
            adjusterName: row.adjuster_name || 'Your Adjuster',
            adjusterPhone: row.adjuster_phone || 'Contact office',
            claimNumber: row.claim_number,
            policyNumber: row.policy_number || 'N/A',
            insuredName: row.insured_name,
            appointmentDate: new Date(row.start_ts).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            appointmentTime: new Date(row.start_ts).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
            }),
            address: row.address,
            estimatedDuration: '1-2 hours'
          };

          const success = await sendAppointmentEmail(
            'reminder',
            row.insured_email,
            appointmentData
          );

          // Log the communication attempt
          await pool.query(`
            INSERT INTO communications (
              id, claim_id, kind, direction, body_preview,
              language, timestamp, provider_id
            ) VALUES (
              gen_random_uuid(), (SELECT claim_id FROM appointments WHERE id = $1),
              'reminder_email', 'outbound', $2, 'en', NOW(), $3
            )
          `, [row.id, `${success ? 'sent' : 'failed'}: reminder email to ${row.insured_email}`, success ? 'sendgrid_success' : 'sendgrid_failed']);

          if (success) {
            remindersSent.push({
              appointmentId: row.id,
              claimNumber: row.claim_number,
              insuredName: row.insured_name
            });
          } else {
            remindersSkipped.push({
              appointmentId: row.id,
              reason: 'Failed to send email'
            });
          }

        } catch (error) {
          app.log.error(`Error sending reminder for appointment ${row.id}:`, error);
          remindersSkipped.push({
            appointmentId: row.id,
            reason: 'Error occurred'
          });
        }
      }

      return {
        remindersSent: remindersSent.length,
        remindersSkipped: remindersSkipped.length,
        details: {
          sent: remindersSent,
          skipped: remindersSkipped
        }
      };

    } catch (error) {
      app.log.error('Error sending reminder emails:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}