import assert from 'node:assert/strict';
import test from 'node:test';

import { DisabledDeploymentAdapter } from '../src/adapters/deployment-adapter.js';
import { handleApiRequest } from '../src/api/handle-request.js';
import { loadRuntimeConfig } from '../src/config/runtime-config.js';
import { runtimeStatus } from '../src/domain/runtime-status.js';
import { disabledGitHubGateway } from '../src/github/github-gateway.js';

test('status exposes a credentialless runtime', () => {
  assert.equal(runtimeStatus.mode, 'offline');
  assert.deepEqual(Object.values(runtimeStatus.capabilities), [
    false,
    false,
    false,
    false,
    false
  ]);
  assert.equal(disabledGitHubGateway.canRead, false);
  assert.equal(disabledGitHubGateway.canWrite, false);
});

test('API exposes only read-only skeleton status', () => {
  const status = handleApiRequest('GET', '/api/v1/status');
  const unsupported = handleApiRequest('POST', '/api/v1/deployments');

  assert.equal(status.statusCode, 200);
  assert.equal(JSON.parse(status.body).phase, 'credentialless-skeleton');
  assert.equal(unsupported.statusCode, 404);
});

test('configuration refuses live or externally bound modes', () => {
  assert.deepEqual(loadRuntimeConfig({}), {
    host: '127.0.0.1',
    mode: 'offline',
    port: 8787
  });
  assert.throws(() => loadRuntimeConfig({ DEPLOY_HUB_MODE: 'production' }));
  assert.throws(() => loadRuntimeConfig({ DEPLOY_HUB_HOST: '0.0.0.0' }));
});

test('deployment adapter always rejects dispatch', async () => {
  const adapter = new DisabledDeploymentAdapter();

  await assert.rejects(adapter.dispatch(), /not implemented/);
});
