import { createServer } from 'node:http';

import { handleApiRequest } from './api/handle-request.js';
import { loadRuntimeConfig } from './config/runtime-config.js';

const config = loadRuntimeConfig();

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  const result = handleApiRequest(request.method ?? 'GET', pathname);

  response.writeHead(result.statusCode, result.headers);
  response.end(result.body);
});

server.listen(config.port, config.host, () => {
  process.stdout.write(
    `Deploy Hub credentialless skeleton listening on http://${config.host}:${config.port}\n`
  );
});
