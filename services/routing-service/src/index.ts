import Fastify from 'fastify';
const app = Fastify({ logger: true });

app.post('/optimize', async (req, reply) => ({ route: { summary: 'optimized-stub' } }));

const port = Number(process.env.PORT || 4300);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
