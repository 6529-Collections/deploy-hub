#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { authenticateGitHubToken } from './ui/github-auth.js';
import {
  createOperationId,
  dispatchOperation,
  freezePullRequests,
  parsePrNumbers,
  readDashboard,
  requestStop
} from './ui/github-operations.js';

export const AGENT_USAGE = `Deploy Hub agent command

Usage:
  deploy-hub submit <staging|production> <pr> [pr...]
  deploy-hub status [operation-id]
  deploy-hub stop <operation-id>
  deploy-hub retry <operation-id>
  deploy-hub remove <pr>

The command uses GH_TOKEN, GITHUB_TOKEN, or the token from gh auth token.
Each invocation performs one bounded action or status snapshot and exits;
GitHub Actions owns execution.`;

export class AgentCommandError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AgentCommandError';
    this.code = code;
  }
}

export function parseAgentCommand(argv) {
  const [command, ...args] = argv;
  if (
    !command ||
    command === 'help' ||
    command === '--help' ||
    command === '-h'
  ) {
    return { command: 'help' };
  }

  if (command === 'submit') {
    const [target, ...prValues] = args;
    if (!['staging', 'production'].includes(target) || prValues.length === 0) {
      throw new AgentCommandError(
        'invalid_arguments',
        'Submit requires a staging or production target and at least one PR.'
      );
    }
    return {
      command,
      prNumbers: parsePrNumbers(prValues.join(' ')),
      target
    };
  }

  if (command === 'status') {
    if (args.length > 1) {
      throw new AgentCommandError(
        'invalid_arguments',
        'Status accepts at most one operation ID.'
      );
    }
    return { command, operationId: args[0] ?? '' };
  }

  if (command === 'stop' || command === 'retry') {
    if (args.length !== 1 || !args[0]) {
      throw new AgentCommandError(
        'invalid_arguments',
        `${command} requires exactly one operation ID.`
      );
    }
    return { command, operationId: args[0] };
  }

  if (command === 'remove') {
    if (args.length !== 1) {
      throw new AgentCommandError(
        'invalid_arguments',
        'Remove requires exactly one PR number.'
      );
    }
    return { command, pr: parsePrNumbers(args[0])[0] };
  }

  throw new AgentCommandError(
    'invalid_arguments',
    `Unknown command: ${command}. Run deploy-hub help.`
  );
}

export function resolveGitHubToken(env = process.env, execute = execFileSync) {
  const configured = (env.GH_TOKEN || env.GITHUB_TOKEN || '').trim();
  if (configured) return configured;

  try {
    const token = execute('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (token) return token;
  } catch {
    // The fixed error below intentionally excludes command output and secrets.
  }

  throw new AgentCommandError(
    'github_auth_unavailable',
    'No GitHub authentication found. Authenticate gh or set GH_TOKEN.'
  );
}

function agentOperationId(createId) {
  return createId().replace(/^ui-/, 'agent-');
}

function uniqueRequests(requests) {
  const unique = new Map();
  for (const request of requests) {
    const key = `${request.pr}:${request.sha}`;
    const existing = unique.get(key);
    unique.set(key, {
      ...existing,
      ...request,
      canRemove: Boolean(existing?.canRemove || request.canRemove),
      queueDescription: request.queueDescription ?? existing?.queueDescription
    });
  }
  return [...unique.values()];
}

function operationSummary(operation) {
  return {
    conclusion: operation.conclusion,
    createdAt: operation.createdAt,
    id: operation.id,
    queued: operation.queued,
    requests: uniqueRequests(operation.requests).map((request) => ({
      pr: request.pr,
      sha: request.sha,
      state: request.state,
      url: request.url
    })),
    run: operation.run
      ? {
          conclusion: operation.run.conclusion,
          id: operation.run.id,
          status: operation.run.status,
          url: operation.run.html_url
        }
      : null,
    status: operation.status
      ? {
          description: operation.status.description,
          state: operation.status.state,
          url: operation.status.targetUrl
        }
      : null,
    target: operation.target,
    terminal: operation.terminal
  };
}

function findOperation(model, operationId) {
  const operation = model.operations.find((item) => item.id === operationId);
  if (!operation) {
    throw new AgentCommandError(
      'operation_not_found',
      `Operation ${operationId} was not found in current GitHub truth.`
    );
  }
  return operation;
}

function assertExactRetry(originalRequests, frozenItems) {
  const original = new Map(
    originalRequests.map((request) => [request.pr, request.sha])
  );
  for (const { manifest } of frozenItems) {
    if (original.get(manifest.pr) !== manifest.sha) {
      throw new AgentCommandError(
        'stale_retry',
        `PR #${manifest.pr} moved after the original operation; retry cannot change its exact SHA.`
      );
    }
  }
}

export async function runAgentCommand(argv, overrides = {}) {
  const parsed = parseAgentCommand(argv);
  if (parsed.command === 'help') {
    return { command: 'help', usage: AGENT_USAGE };
  }

  const dependencies = {
    authenticate: authenticateGitHubToken,
    createId: createOperationId,
    dispatch: dispatchOperation,
    freeze: freezePullRequests,
    read: readDashboard,
    resolveToken: resolveGitHubToken,
    stop: requestStop,
    ...overrides
  };
  const token = dependencies.resolveToken();
  const identity = await dependencies.authenticate(token);

  if (parsed.command === 'submit') {
    const frozen = await dependencies.freeze({
      prNumbers: parsed.prNumbers,
      requester: identity.login,
      target: parsed.target,
      token
    });
    const operationId = agentOperationId(dependencies.createId);
    const requests = frozen.map(({ manifest }) => manifest);
    await dependencies.dispatch({ operationId, requests, token });
    return { command: 'submit', operationId, requests };
  }

  const model = await dependencies.read(token);

  if (parsed.command === 'status') {
    if (parsed.operationId) {
      return {
        command: 'status',
        operation: operationSummary(findOperation(model, parsed.operationId)),
        refreshedAt: model.refreshedAt
      };
    }
    return {
      command: 'status',
      environments: model.environments,
      operations: model.operations.map(operationSummary),
      refreshedAt: model.refreshedAt,
      waiting: model.waiting
    };
  }

  if (parsed.command === 'stop') {
    const operation = findOperation(model, parsed.operationId);
    if (operation.terminal) {
      throw new AgentCommandError(
        'operation_terminal',
        `Operation ${operation.id} is already terminal.`
      );
    }
    const requests = uniqueRequests(operation.requests);
    if (requests.length === 0) {
      throw new AgentCommandError(
        'operation_incomplete',
        `Operation ${operation.id} has no exact PR requests to stop.`
      );
    }
    await dependencies.stop({
      operationId: operation.id,
      queued: operation.queued,
      requests,
      runUrl: operation.runUrl || operation.status?.targetUrl,
      token
    });
    return {
      command: 'stop',
      operationId: operation.id,
      outcome: operation.queued
        ? 'cancelled-before-mutation'
        : 'safe-stop-requested'
    };
  }

  if (parsed.command === 'retry') {
    const operation = findOperation(model, parsed.operationId);
    if (!operation.terminal) {
      throw new AgentCommandError(
        'operation_active',
        `Operation ${operation.id} is still active and cannot be retried.`
      );
    }
    const requests = uniqueRequests(operation.requests);
    if (
      requests.length === 0 ||
      !['staging', 'production'].includes(operation.target)
    ) {
      throw new AgentCommandError(
        'operation_incomplete',
        `Operation ${operation.id} lacks an exact retryable request.`
      );
    }
    const frozen = await dependencies.freeze({
      prNumbers: requests.map(({ pr }) => pr),
      requester: identity.login,
      target: operation.target,
      token
    });
    assertExactRetry(requests, frozen);
    const operationId = agentOperationId(dependencies.createId);
    const retryRequests = frozen.map(({ manifest }) => manifest);
    await dependencies.dispatch({
      operationId,
      requests: retryRequests,
      token
    });
    return {
      command: 'retry',
      operationId,
      requests: retryRequests,
      retriedOperationId: operation.id
    };
  }

  const candidate = model.operations
    .flatMap((operation) => uniqueRequests(operation.requests))
    .find((request) => request.pr === parsed.pr && request.canRemove);
  if (!candidate) {
    throw new AgentCommandError(
      'not_in_staging',
      `PR #${parsed.pr} is not a tracked, open Deploy Hub PR in staging.`
    );
  }
  const frozen = await dependencies.freeze({
    prNumbers: [parsed.pr],
    requester: identity.login,
    target: 'staging',
    token
  });
  assertExactRetry([candidate], frozen);
  const operationId = agentOperationId(dependencies.createId);
  const request = frozen[0].manifest;
  await dependencies.dispatch({
    action: 'remove-from-staging',
    operationId,
    requests: [request],
    token
  });
  return { command: 'remove', operationId, requests: [request] };
}

async function main() {
  try {
    const result = await runAgentCommand(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify(
        {
          code: error.code ?? 'unexpected_error',
          error: error.message ?? 'Deploy Hub command failed.'
        },
        null,
        2
      )}\n`
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
