import Fastify from 'fastify';
const app = Fastify({ logger: true });

// Proxy/adapter stubs
app.get('/claims/assignments', async (req, reply) => ({ claims: [] }));
app.get('/claims/:claimId/appointments', async (req, reply) => ({ appointments: [] }));
app.post('/claims/:claimId/appointments', async (req, reply) => ({ status: 'upserted' }));
app.post('/claims/:claimId/communications', async (req, reply) => ({ status: 'logged' }));
app.patch('/claims/:claimId/stage', async (req, reply) => ({ status: 'updated' }));
app.post('/events/webhook', async (req, reply) => ({ ok: true }));

const port = Number(process.env.PORT || 4100);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
