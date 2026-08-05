import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AgentCommandError,
  parseAgentCommand,
  resolveGitHubToken,
  runAgentCommand
} from '../deploy-hub.mjs';

const TOKEN = 'agent-token-canary';
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

function request(pr, sha, target = 'staging') {
  return {
    manifest: {
      pr,
      repository: '6529-Collections/6529seize-frontend',
      requested_at: '2026-08-05T12:00:00.000Z',
      requester: 'prxt6529',
      sha,
      target
    }
  };
}

function operation(overrides = {}) {
  return {
    conclusion: 'failure',
    createdAt: '2026-08-05T12:00:00.000Z',
    id: 'agent-original',
    queued: false,
    requests: [
      {
        canRemove: false,
        pr: 12,
        sha: SHA_A,
        state: 'OPEN',
        url: 'https://github.com/example/pull/12'
      }
    ],
    run: {
      conclusion: 'failure',
      html_url: 'https://github.com/example/actions/runs/123',
      id: 123,
      status: 'completed'
    },
    runUrl: 'https://github.com/example/actions/runs/123',
    status: {
      description: 'Staging failed',
      state: 'failure',
      targetUrl: 'https://github.com/example/actions/runs/123'
    },
    target: 'staging',
    terminal: true,
    ...overrides
  };
}

function dependencies(overrides = {}) {
  return {
    authenticate: async (token) => {
      assert.equal(token, TOKEN);
      return { login: 'prxt6529' };
    },
    createId: () => 'ui-new-operation',
    dispatch: async () => {},
    freeze: async ({ prNumbers, target }) =>
      prNumbers.map((pr) => request(pr, pr === 12 ? SHA_A : SHA_B, target)),
    read: async () => ({
      environments: { production: null, staging: null },
      operations: [operation()],
      refreshedAt: '2026-08-05T12:05:00.000Z',
      waiting: 0
    }),
    resolveToken: () => TOKEN,
    stop: async () => {},
    ...overrides
  };
}

test('parses the five bounded agent actions', () => {
  assert.deepEqual(parseAgentCommand(['submit', 'production', '12', '34']), {
    command: 'submit',
    prNumbers: [12, 34],
    target: 'production'
  });
  assert.deepEqual(parseAgentCommand(['status', 'agent-one']), {
    command: 'status',
    operationId: 'agent-one'
  });
  assert.deepEqual(parseAgentCommand(['stop', 'agent-one']), {
    command: 'stop',
    operationId: 'agent-one'
  });
  assert.deepEqual(parseAgentCommand(['retry', 'agent-one']), {
    command: 'retry',
    operationId: 'agent-one'
  });
  assert.deepEqual(parseAgentCommand(['remove', '12']), {
    command: 'remove',
    pr: 12
  });
  assert.throws(
    () => parseAgentCommand(['submit', 'staging']),
    (error) =>
      error instanceof AgentCommandError && error.code === 'invalid_arguments'
  );
});

test('uses existing environment or gh authentication without exposing it', () => {
  assert.equal(resolveGitHubToken({ GH_TOKEN: ` ${TOKEN} ` }), TOKEN);
  assert.equal(
    resolveGitHubToken({}, (command, args) => {
      assert.equal(command, 'gh');
      assert.deepEqual(args, ['auth', 'token']);
      return `${TOKEN}\n`;
    }),
    TOKEN
  );
  assert.throws(
    () =>
      resolveGitHubToken({}, () => {
        throw new Error(TOKEN);
      }),
    (error) =>
      error instanceof AgentCommandError &&
      error.code === 'github_auth_unavailable' &&
      !error.message.includes(TOKEN)
  );
});

test('submits frozen exact heads through the shared workflow contract', async () => {
  let dispatched;
  const result = await runAgentCommand(
    ['submit', 'production', '12', '34'],
    dependencies({
      dispatch: async (input) => {
        dispatched = input;
      }
    })
  );

  assert.equal(result.operationId, 'agent-new-operation');
  assert.deepEqual(
    result.requests.map(({ pr, sha, target }) => ({ pr, sha, target })),
    [
      { pr: 12, sha: SHA_A, target: 'production' },
      { pr: 34, sha: SHA_B, target: 'production' }
    ]
  );
  assert.equal(dispatched.operationId, 'agent-new-operation');
  assert.equal(dispatched.token, TOKEN);
});

test('returns one compact status snapshot with exact run identity', async () => {
  const result = await runAgentCommand(
    ['status', 'agent-original'],
    dependencies()
  );

  assert.equal(result.operation.id, 'agent-original');
  assert.deepEqual(result.operation.requests, [
    {
      pr: 12,
      sha: SHA_A,
      state: 'OPEN',
      url: 'https://github.com/example/pull/12'
    }
  ]);
  assert.deepEqual(result.operation.run, {
    conclusion: 'failure',
    id: 123,
    status: 'completed',
    url: 'https://github.com/example/actions/runs/123'
  });
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
});

test('stops the exact active operation and exits without polling', async () => {
  let stopped;
  const active = operation({
    conclusion: 'in_progress',
    queued: true,
    requests: [
      {
        pr: 12,
        queueDescription:
          'Queued 1/1 for Staging · agent-original · 2026-08-05T12:00:00.000Z',
        sha: SHA_A
      },
      {
        pr: 12,
        sha: SHA_A
      }
    ],
    terminal: false
  });
  const result = await runAgentCommand(
    ['stop', 'agent-original'],
    dependencies({
      read: async () => ({ operations: [active] }),
      stop: async (input) => {
        stopped = input;
      }
    })
  );

  assert.equal(result.outcome, 'cancelled-before-mutation');
  assert.equal(stopped.operationId, 'agent-original');
  assert.equal(stopped.queued, true);
  assert.deepEqual(
    stopped.requests.map(({ sha }) => sha),
    [SHA_A]
  );
  assert.match(stopped.requests[0].queueDescription, /^Queued 1\/1/);
});

test('retries only a terminal operation with the same exact SHA and target', async () => {
  let dispatched;
  const result = await runAgentCommand(
    ['retry', 'agent-original'],
    dependencies({
      dispatch: async (input) => {
        dispatched = input;
      }
    })
  );

  assert.equal(result.operationId, 'agent-new-operation');
  assert.equal(result.retriedOperationId, 'agent-original');
  assert.equal(dispatched.requests[0].sha, SHA_A);
  assert.equal(dispatched.requests[0].target, 'staging');

  await assert.rejects(
    runAgentCommand(
      ['retry', 'agent-original'],
      dependencies({
        freeze: async () => [request(12, SHA_B)]
      })
    ),
    (error) =>
      error instanceof AgentCommandError && error.code === 'stale_retry'
  );
});

test('removes only a tracked open exact PR currently present in staging', async () => {
  let dispatched;
  const removable = operation({
    requests: [
      {
        canRemove: true,
        pr: 12,
        sha: SHA_A,
        state: 'OPEN',
        url: 'https://github.com/example/pull/12'
      }
    ]
  });
  const result = await runAgentCommand(
    ['remove', '12'],
    dependencies({
      dispatch: async (input) => {
        dispatched = input;
      },
      read: async () => ({ operations: [removable] })
    })
  );

  assert.equal(result.operationId, 'agent-new-operation');
  assert.equal(dispatched.action, 'remove-from-staging');
  assert.equal(dispatched.requests[0].sha, SHA_A);

  await assert.rejects(
    runAgentCommand(
      ['remove', '34'],
      dependencies({ read: async () => ({ operations: [removable] }) })
    ),
    (error) =>
      error instanceof AgentCommandError && error.code === 'not_in_staging'
  );
});
