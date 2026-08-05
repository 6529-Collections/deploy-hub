import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FRONTEND_REPOSITORY,
  GitHubOperationError,
  QUEUED_REQUEST_CONTEXT,
  buildDashboardModel,
  createOperationId,
  dispatchOperation,
  freezePullRequests,
  listOpenPullRequests,
  parsePrNumbers,
  requestStop
} from '../ui/github-operations.js';

const TOKEN = 'operation-token-canary';
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const RUN_URL =
  'https://github.com/6529-Collections/6529seize-frontend/actions/runs/123';

function jsonResponse(status, payload = {}) {
  return {
    json: async () => payload,
    ok: status >= 200 && status < 300,
    status
  };
}

test('parses a bounded ordered list of unique PR numbers', () => {
  assert.deepEqual(parsePrNumbers('12, 34\n56'), [12, 34, 56]);
  assert.throws(
    () => parsePrNumbers('12, 12'),
    (error) =>
      error instanceof GitHubOperationError && error.code === 'invalid_prs'
  );
  assert.throws(() => parsePrNumbers('not-a-pr'), /positive whole numbers/);
});

test('creates compact workflow-safe operation identities', () => {
  const cryptoImpl = {
    getRandomValues(bytes) {
      bytes.set([1, 2, 3, 4]);
      return bytes;
    }
  };
  assert.equal(
    createOperationId(() => 123456, cryptoImpl),
    'ui-2n9c-01020304'
  );
});

test('lists open main-targeted PRs for the searchable picker', async () => {
  let requestedUrl = '';
  const pulls = await listOpenPullRequests({
    fetchImpl: async (url) => {
      requestedUrl = url;
      return jsonResponse(200, [
        {
          head: { ref: 'feature/searchable-picker', sha: SHA_A },
          html_url: 'https://github.com/example/pull/12',
          number: 12,
          title: 'Searchable picker',
          user: { login: 'developer' }
        }
      ]);
    },
    token: TOKEN
  });

  assert.match(
    requestedUrl,
    /pulls\?state=open&base=main&sort=updated&direction=desc&per_page=100$/
  );
  assert.deepEqual(pulls, [
    {
      author: 'developer',
      branch: 'feature/searchable-picker',
      number: 12,
      sha: SHA_A,
      title: 'Searchable picker',
      url: 'https://github.com/example/pull/12'
    }
  ]);
});

test('freezes exact open PR heads without exposing the token', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ options, url });
    const pr = Number(url.split('/').at(-1));
    return jsonResponse(200, {
      base: { ref: 'main' },
      head: { sha: pr === 12 ? SHA_A : SHA_B },
      html_url: `https://github.com/example/pull/${pr}`,
      state: 'open',
      title: `PR ${pr}`
    });
  };

  const frozen = await freezePullRequests({
    fetchImpl,
    now: () => new Date('2026-08-04T12:00:00.000Z'),
    prNumbers: [12, 34],
    requester: 'prxt6529',
    target: 'production',
    token: TOKEN
  });

  assert.deepEqual(
    frozen.map(({ manifest }) => manifest),
    [
      {
        pr: 12,
        repository: FRONTEND_REPOSITORY,
        requested_at: '2026-08-04T12:00:00.000Z',
        requester: 'prxt6529',
        sha: SHA_A,
        target: 'production'
      },
      {
        pr: 34,
        repository: FRONTEND_REPOSITORY,
        requested_at: '2026-08-04T12:00:00.000Z',
        requester: 'prxt6529',
        sha: SHA_B,
        target: 'production'
      }
    ]
  );
  assert.equal(JSON.stringify(frozen).includes(TOKEN), false);
  assert.equal(
    requests.every(({ url }) => !url.includes(TOKEN)),
    true
  );
  assert.equal(
    requests.every(
      ({ options }) => options.headers.authorization === `Bearer ${TOKEN}`
    ),
    true
  );
});

test('dispatches the immutable live workflow contract', async () => {
  const captured = [];
  const manifest = {
    pr: 12,
    repository: FRONTEND_REPOSITORY,
    requested_at: '2026-08-04T12:00:00.000Z',
    requester: 'prxt6529',
    sha: SHA_A,
    target: 'staging'
  };
  await dispatchOperation({
    fetchImpl: async (url, options) => {
      captured.push({ options, url });
      return url.includes('/dispatches')
        ? jsonResponse(204)
        : jsonResponse(201);
    },
    operationId: 'ui-operation-1',
    requests: [manifest],
    token: TOKEN
  });

  assert.match(
    captured[1].url,
    /actions\/workflows\/deploy-hub\.yml\/dispatches$/
  );
  assert.deepEqual(JSON.parse(captured[0].options.body), {
    context: QUEUED_REQUEST_CONTEXT,
    description:
      'Queued 1/1 for Staging · ui-operation-1 · 2026-08-04T12:00:00.000Z',
    state: 'pending',
    target_url:
      'https://github.com/6529-Collections/6529seize-frontend/actions/workflows/deploy-hub.yml'
  });
  assert.deepEqual(JSON.parse(captured[1].options.body), {
    inputs: {
      action: 'deploy',
      confirmation: 'DEPLOY',
      manifest: JSON.stringify([manifest]),
      operation_id: 'ui-operation-1'
    },
    ref: 'main'
  });
});

test('clears durable queued status when workflow dispatch fails', async () => {
  const captured = [];
  const manifest = {
    pr: 12,
    repository: FRONTEND_REPOSITORY,
    requested_at: '2026-08-04T12:00:00.000Z',
    requester: 'prxt6529',
    sha: SHA_A,
    target: 'production'
  };

  await assert.rejects(
    dispatchOperation({
      fetchImpl: async (url, options) => {
        captured.push({ options, url });
        return url.includes('/dispatches')
          ? jsonResponse(404)
          : jsonResponse(201);
      },
      operationId: 'ui-operation-2',
      requests: [manifest],
      token: TOKEN
    }),
    (error) =>
      error instanceof GitHubOperationError &&
      error.code === 'workflow_unavailable'
  );

  assert.equal(captured.length, 3);
  assert.deepEqual(JSON.parse(captured[2].options.body), {
    context: QUEUED_REQUEST_CONTEXT,
    description:
      'Dispatch failed 1/1 for Production · ui-operation-2 · 2026-08-04T12:00:00.000Z',
    state: 'error',
    target_url:
      'https://github.com/6529-Collections/6529seize-frontend/actions/workflows/deploy-hub.yml'
  });
});

test('publishes an exact stop request for every participating SHA', async () => {
  const calls = [];
  await requestStop({
    fetchImpl: async (url, options) => {
      calls.push({ options, url });
      return jsonResponse(201, {});
    },
    operationId: 'ui-operation-1',
    requests: [{ sha: SHA_A }, { sha: SHA_B }],
    runUrl: RUN_URL,
    token: TOKEN
  });

  assert.equal(calls.length, 2);
  assert.equal(
    JSON.parse(calls[0].options.body).context,
    'Deploy Hub Stop — ui-operation-1'
  );
  assert.equal(JSON.parse(calls[0].options.body).target_url, RUN_URL);
});

test('cancels a queued request and publishes its exact stop boundary', async () => {
  const calls = [];
  const queueDescription =
    'Queued 1/1 for Staging · ui-operation-1 · 2026-08-04T12:00:00.000Z';
  await requestStop({
    fetchImpl: async (url, options) => {
      calls.push({ options, url });
      return jsonResponse(201, {});
    },
    operationId: 'ui-operation-1',
    queued: true,
    requests: [{ queueDescription, sha: SHA_A }],
    runUrl: RUN_URL,
    token: TOKEN
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    context: QUEUED_REQUEST_CONTEXT,
    description:
      'Cancelled 1/1 for Staging · ui-operation-1 · 2026-08-04T12:00:00.000Z',
    state: 'error',
    target_url: RUN_URL
  });
});

test('shows durable queued requests even when no controller run survives', () => {
  const queueDescription =
    'Queued 1/1 for Production · ui-operation-1 · 2026-08-04T12:00:00.000Z';
  const repository = {
    pullRequests: {
      nodes: [
        {
          commits: {
            nodes: [
              {
                commit: {
                  oid: SHA_A,
                  statusCheckRollup: {
                    contexts: {
                      nodes: [
                        {
                          __typename: 'StatusContext',
                          context: QUEUED_REQUEST_CONTEXT,
                          createdAt: '2026-08-04T12:00:00.000Z',
                          description: queueDescription,
                          state: 'PENDING',
                          targetUrl:
                            'https://github.com/6529-Collections/6529seize-frontend/actions/workflows/deploy-hub.yml'
                        }
                      ]
                    }
                  }
                }
              }
            ]
          },
          headRefOid: SHA_A,
          number: 12,
          state: 'OPEN',
          title: 'Queued feature',
          url: 'https://github.com/example/pull/12'
        }
      ]
    }
  };

  const model = buildDashboardModel(
    repository,
    { workflow_runs: [] },
    '2026-08-04T12:00:05.000Z'
  );

  assert.equal(model.waiting, 1);
  assert.equal(model.operations.length, 1);
  assert.equal(model.operations[0].id, 'ui-operation-1');
  assert.equal(model.operations[0].queued, true);
  assert.equal(model.operations[0].target, 'production');
  assert.equal(model.operations[0].terminal, false);
  assert.equal(
    model.operations[0].requests[0].queueDescription,
    queueDescription
  );
});

test('derives operations, waiting work, and environment runs from GitHub truth', () => {
  const operationRun = {
    conclusion: null,
    created_at: '2026-08-04T12:00:00.000Z',
    display_title: 'Deploy Hub ui-operation-1',
    html_url: RUN_URL,
    id: 123,
    path: '.github/workflows/deploy-hub.yml',
    status: 'in_progress'
  };
  const stagingRun = {
    conclusion: 'success',
    created_at: '2026-08-04T11:50:00.000Z',
    html_url: `${RUN_URL}0`,
    id: 122,
    path: '.github/workflows/deploy-staging.yml',
    status: 'completed'
  };
  const repository = {
    pullRequests: {
      nodes: [
        {
          commits: {
            nodes: [
              {
                commit: {
                  oid: SHA_A,
                  statusCheckRollup: {
                    contexts: {
                      nodes: [
                        {
                          __typename: 'StatusContext',
                          context: 'Deploy Hub — Target: Staging',
                          createdAt: '2026-08-04T12:00:02.000Z',
                          description: 'Deploying staging snapshot',
                          state: 'PENDING',
                          targetUrl: RUN_URL
                        },
                        {
                          __typename: 'StatusContext',
                          context: 'Deploy Hub — Staging Presence',
                          createdAt: '2026-08-04T12:00:02.000Z',
                          description: 'In staging',
                          state: 'SUCCESS',
                          targetUrl: RUN_URL
                        }
                      ]
                    }
                  }
                }
              }
            ]
          },
          headRefOid: SHA_A,
          number: 12,
          state: 'OPEN',
          title: 'Example feature',
          url: 'https://github.com/example/pull/12'
        }
      ]
    }
  };

  const model = buildDashboardModel(
    repository,
    { workflow_runs: [operationRun, stagingRun] },
    '2026-08-04T12:00:05.000Z'
  );

  assert.equal(model.waiting, 0);
  assert.equal(model.environments.staging.id, 122);
  assert.equal(model.operations.length, 1);
  assert.equal(model.operations[0].id, 'ui-operation-1');
  assert.equal(model.operations[0].target, 'staging');
  assert.equal(model.operations[0].terminal, false);
  assert.equal(model.operations[0].requests[0].canRemove, true);
});

test('recovers the operation id from a correlated canonical workflow run', () => {
  const controller = {
    conclusion: null,
    created_at: '2026-08-04T12:00:00.000Z',
    display_title: 'Deploy Hub ui-operation-1',
    html_url: RUN_URL,
    id: 123,
    path: '.github/workflows/deploy-hub.yml',
    status: 'in_progress'
  };
  const evidenceUrl = `${RUN_URL}4`;
  const evidence = {
    conclusion: null,
    created_at: '2026-08-04T12:01:00.000Z',
    display_title: 'Staging E2E [dh-123r1-c1-staging-a1]',
    html_url: evidenceUrl,
    id: 124,
    path: '.github/workflows/staging-e2e.yml',
    status: 'in_progress'
  };
  const repository = {
    pullRequests: {
      nodes: [
        {
          commits: {
            nodes: [
              {
                commit: {
                  oid: SHA_A,
                  statusCheckRollup: {
                    contexts: {
                      nodes: [
                        {
                          __typename: 'StatusContext',
                          context: 'Deploy Hub — Target: Staging',
                          createdAt: '2026-08-04T12:01:01.000Z',
                          description: 'Validating staging',
                          state: 'PENDING',
                          targetUrl: evidenceUrl
                        }
                      ]
                    }
                  }
                }
              }
            ]
          },
          headRefOid: SHA_A,
          number: 12,
          state: 'OPEN',
          title: 'Example feature',
          url: 'https://github.com/example/pull/12'
        }
      ]
    }
  };

  const model = buildDashboardModel(
    repository,
    { workflow_runs: [evidence, controller] },
    '2026-08-04T12:01:05.000Z'
  );

  assert.equal(model.operations.length, 1);
  assert.equal(model.operations[0].id, 'ui-operation-1');
  assert.equal(model.operations[0].runUrl, evidenceUrl);
  assert.equal(model.operations[0].terminal, false);
});
