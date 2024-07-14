import { createServer } from '@stoplight/prism-http-server';
import { getHttpOperationsFromSpec } from '@stoplight/prism-cli/dist/operations.js';
import { createLogger } from '@stoplight/prism-core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import _ from 'lodash';
import generateCustomLogicMiddleware from './middleware/generateCustomLogic.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadSpecs = async () => {
  const specsDir = path.join(__dirname, 'specs');
  const files = fs.readdirSync(specsDir).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
  const operationsArray = await Promise.all(
    files.map(file => getHttpOperationsFromSpec(path.join(specsDir, file)))
  );
  return _.flatten(operationsArray);
};

async function createPrismServer() {
  const operations = await loadSpecs();

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