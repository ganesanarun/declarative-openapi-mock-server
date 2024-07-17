import { createServer } from '@stoplight/prism-http-server';
import { createLogger } from '@stoplight/prism-core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import express from 'express';

import generateCustomLogicMiddleware from './middleware/generateCustomLogic.js';
import { loadOperations } from './common/core.js';


async function createPrismServer() {
  const operations = await loadOperations('../specs');

  const server = createServer(operations, {
    components: {
      logger: createLogger('TestLogger'),
    },
    cors: true,
    config: {
      checkSecurity: false,
      validateRequest: false,
      validateResponse: true,
      mock: { dynamic: false },
      isProxy: false,
      errors: false,
      debug: false
    },
  });
  await server.listen(4010);

  return {
    close: server.close.bind(server),
  };
}

await createPrismServer();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(generateCustomLogicMiddleware());
app.use(
  createProxyMiddleware({
    target: 'http://localhost:4010',
    changeOrigin: true,
    logLevel: 'info',
  })
);

app.listen(3000, () => {
  console.log('Custom mock server running on http://localhost:3000');
});