import Fastify from 'fastify';
import { 
  getEmailProvider, 
  getSMSProvider, 
  getWhatsAppProvider, 
  getLanguageDetectionProvider 
} from './providers/index.js';

const fastify = Fastify({ logger: true });

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', service: 'comms-service', timestamp: new Date().toISOString() };
});

// Send email
fastify.post('/send-email', async (request, reply) => {
  const { to, subject, content, templateId } = request.body as {
    to: string;
    subject: string;
    content: string;
    templateId?: string;
  };

  if (!to || !subject || !content) {
    return reply.code(400).send({ error: 'Missing required fields: to, subject, content' });
  }

  try {
    const emailProvider = getEmailProvider();
    const result = await emailProvider.sendEmail(to, subject, content, templateId);
    
    if (result.success) {
      return { success: true, messageId: result.messageId };
    } else {
      return reply.code(500).send({ error: result.error });
    }
  } catch (error) {
    console.error('Email sending error:', error);
    return reply.code(500).send({ error: 'Failed to send email' });
  }
});

// Send SMS
fastify.post('/send-sms', async (request, reply) => {
  const { to, message } = request.body as {
    to: string;
    message: string;
  };

  if (!to || !message) {
    return reply.code(400).send({ error: 'Missing required fields: to, message' });
  }

  try {
    const smsProvider = getSMSProvider();
    const result = await smsProvider.sendSMS(to, message);
    
    if (result.success) {
      return { success: true, messageId: result.messageId, cost: result.cost };
    } else {
      return reply.code(500).send({ error: result.error });
    }
  } catch (error) {
    console.error('SMS sending error:', error);
    return reply.code(500).send({ error: 'Failed to send SMS' });
  }
});

// Send WhatsApp
fastify.post('/send-whatsapp', async (request, reply) => {
  const { to, message } = request.body as {
    to: string;
    message: string;
  };

  if (!to || !message) {
    return reply.code(400).send({ error: 'Missing required fields: to, message' });
  }

  try {
    const whatsappProvider = getWhatsAppProvider();
    const result = await whatsappProvider.sendWhatsApp(to, message);
    
    if (result.success) {
      return { success: true, messageId: result.messageId };
    } else {
      return reply.code(500).send({ error: result.error });
    }
  } catch (error) {
    console.error('WhatsApp sending error:', error);
    return reply.code(500).send({ error: 'Failed to send WhatsApp message' });
  }
});

// Detect language
fastify.post('/detect-language', async (request, reply) => {
  const { text } = request.body as { text: string };

  if (!text) {
    return reply.code(400).send({ error: 'Missing required field: text' });
  }

  try {
    const languageProvider = getLanguageDetectionProvider();
    const result = await languageProvider.detectLanguage(text);
    
    if (result.success) {
      return { 
        success: true, 
        language: result.language, 
        confidence: result.confidence 
      };
    } else {
      return reply.code(500).send({ error: result.error });
    }
  } catch (error) {
    console.error('Language detection error:', error);
    return reply.code(500).send({ error: 'Failed to detect language' });
  }
});

// Legacy compatibility endpoints
fastify.post('/consent', async (req, reply) => ({ status: 'ok' }));
fastify.post('/inbound-sms', async (req, reply) => ({ status: 'received' }));

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8008');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Communications service listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
