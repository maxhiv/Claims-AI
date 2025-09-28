import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ ok: true }));

// Example route stubs matching OpenAPI
app.get('/api/claims/assignments', async (req, reply) => {
  return { claims: [] };
});
app.get('/api/claims/:claimId/appointments', async (req, reply) => {
  return { appointments: [] };
});
app.post('/api/claims/:claimId/appointments', async (req, reply) => {
  return { status: 'upserted' };
});
app.post('/api/claims/:claimId/communications', async (req, reply) => {
  return { status: 'accepted' };
});
app.patch('/api/claims/:claimId/stage', async (req, reply) => {
  return { status: 'updated' };
});
app.post('/api/routing/optimize', async (req, reply) => {
  return { route: { summary: 'stub' } };
});

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
