import Fastify from 'fastify';
const app = Fastify({ logger: true });

app.post('/send-sms', async (req, reply) => ({ status: 'queued' }));
app.post('/send-email', async (req, reply) => ({ status: 'queued' }));
app.post('/consent', async (req, reply) => ({ status: 'ok' }));
app.post('/inbound-sms', async (req, reply) => ({ status: 'received' }));

const port = Number(process.env.PORT || 4200);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
