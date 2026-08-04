const GITHUB_API = 'https://api.github.com';
const GITHUB_GRAPHQL = `${GITHUB_API}/graphql`;

export const FRONTEND_REPOSITORY = '6529-Collections/6529seize-frontend';
export const FRONTEND_DEFAULT_BRANCH = 'main';
export const LIVE_WORKFLOW = 'deploy-hub.yml';
export const QUEUED_REQUEST_CONTEXT = 'Deploy Hub Request';

const SHA_PATTERN = /^[a-f0-9]{40}$/;
const QUEUED_REQUEST_PATTERN =
  /^(Queued|Cancelled|Registration failed|Dispatch failed) ([1-9]\d?)\/([1-9]\d?) for (Staging|Production) · ([A-Za-z0-9][A-Za-z0-9._-]{0,79}) · (\S+)$/;
const TARGETS = new Set(['staging', 'production']);
const MAX_REQUESTS = 20;

const DASHBOARD_QUERY = `
  query DeployHubDashboard($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      pullRequests(
        first: 50
        states: [OPEN, CLOSED, MERGED]
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        nodes {
          number
          title
          url
          state
          mergedAt
          headRefOid
          commits(last: 1) {
            nodes {
              commit {
                oid
                statusCheckRollup {
                  contexts(first: 100) {
                    nodes {
                      __typename
                      ... on StatusContext {
                        context
                        state
                        description
                        targetUrl
                        createdAt
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export class GitHubOperationError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'GitHubOperationError';
    this.code = code;
    this.status = status;
  }
}

function requestHeaders(token) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    'x-github-api-version': '2022-11-28'
  };
}

async function githubRequest(
  path,
  token,
  options = {},
  fetchImpl = globalThis.fetch
) {
  const response = await fetchImpl(`${GITHUB_API}${path}`, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: requestHeaders(token),
    method: options.method ?? 'GET'
  });

  if (!response.ok) {
    const missingWorkflow =
      response.status === 404 && path.includes('/actions/');
    throw new GitHubOperationError(
      missingWorkflow ? 'workflow_unavailable' : 'github_request_failed',
      missingWorkflow
        ? 'The frontend Deploy Hub workflow is still pending merge.'
        : `GitHub rejected the request (HTTP ${response.status}).`,
      response.status
    );
  }

  return response.status === 204 ? null : response.json();
}

async function githubGraphql(token, fetchImpl = globalThis.fetch) {
  const [owner, name] = FRONTEND_REPOSITORY.split('/');
  const response = await fetchImpl(GITHUB_GRAPHQL, {
    body: JSON.stringify({
      query: DASHBOARD_QUERY,
      variables: { owner, name }
    }),
    headers: requestHeaders(token),
    method: 'POST'
  });

  if (!response.ok) {
    throw new GitHubOperationError(
      'github_read_failed',
      `GitHub dashboard refresh failed (HTTP ${response.status}).`,
      response.status
    );
  }

  const payload = await response.json();
  if (payload.errors?.length || !payload.data?.repository) {
    throw new GitHubOperationError(
      'github_read_failed',
      'GitHub returned an incomplete dashboard response.'
    );
  }
  return payload.data.repository;
}

export function parsePrNumbers(value) {
  const tokens = value
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (tokens.length === 0) {
    throw new GitHubOperationError(
      'invalid_prs',
      'Enter at least one PR number.'
    );
  }
  if (tokens.length > MAX_REQUESTS) {
    throw new GitHubOperationError(
      'invalid_prs',
      `A request can contain at most ${MAX_REQUESTS} PRs.`
    );
  }

  const numbers = tokens.map((token) => Number(token));
  if (numbers.some((number) => !Number.isSafeInteger(number) || number <= 0)) {
    throw new GitHubOperationError(
      'invalid_prs',
      'PR numbers must be positive whole numbers.'
    );
  }
  if (new Set(numbers).size !== numbers.length) {
    throw new GitHubOperationError('invalid_prs', 'Do not repeat a PR number.');
  }
  return numbers;
}

export function createOperationId(
  now = Date.now,
  cryptoImpl = globalThis.crypto
) {
  const bytes = new Uint8Array(4);
  cryptoImpl.getRandomValues(bytes);
  const suffix = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `ui-${now().toString(36)}-${suffix}`;
}

export async function freezePullRequests({
  prNumbers,
  requester,
  target,
  token,
  fetchImpl = globalThis.fetch,
  now = () => new Date()
}) {
  if (!TARGETS.has(target)) {
    throw new GitHubOperationError(
      'invalid_target',
      'Choose a deployment target.'
    );
  }

  const requestedAt = now().toISOString();
  const frozen = [];
  for (const pr of prNumbers) {
    const pull = await githubRequest(
      `/repos/${FRONTEND_REPOSITORY}/pulls/${pr}`,
      token,
      {},
      fetchImpl
    );
    if (pull.state !== 'open' || pull.base?.ref !== FRONTEND_DEFAULT_BRANCH) {
      throw new GitHubOperationError(
        'invalid_pull_request',
        `PR #${pr} must be open against ${FRONTEND_DEFAULT_BRANCH}.`
      );
    }
    if (!SHA_PATTERN.test(pull.head?.sha ?? '')) {
      throw new GitHubOperationError(
        'invalid_pull_request',
        `PR #${pr} has no valid exact head SHA.`
      );
    }
    frozen.push({
      manifest: {
        repository: FRONTEND_REPOSITORY,
        pr,
        sha: pull.head.sha,
        target,
        requester,
        requested_at: requestedAt
      },
      title: pull.title,
      url: pull.html_url
    });
  }
  return frozen;
}

export async function dispatchOperation({
  action = 'deploy',
  operationId,
  requests,
  token,
  fetchImpl = globalThis.fetch
}) {
  const confirmation = action === 'remove-from-staging' ? 'REMOVE' : 'DEPLOY';
  const workflowUrl = `https://github.com/${FRONTEND_REPOSITORY}/actions/workflows/${LIVE_WORKFLOW}`;

  function requestDescription(label, request, index) {
    const target = request.target === 'production' ? 'Production' : 'Staging';
    return `${label} ${index + 1}/${requests.length} for ${target} · ${operationId} · ${request.requested_at}`;
  }

  async function publishRequestState(request, state, description) {
    return githubRequest(
      `/repos/${FRONTEND_REPOSITORY}/statuses/${request.sha}`,
      token,
      {
        method: 'POST',
        body: {
          state,
          target_url: workflowUrl,
          description,
          context: QUEUED_REQUEST_CONTEXT
        }
      },
      fetchImpl
    );
  }

  if (action === 'deploy') {
    try {
      await Promise.all(
        requests.map((request, index) =>
          publishRequestState(
            request,
            'pending',
            requestDescription('Queued', request, index)
          )
        )
      );
    } catch (error) {
      await Promise.allSettled(
        requests.map((request, index) =>
          publishRequestState(
            request,
            'error',
            requestDescription('Registration failed', request, index)
          )
        )
      );
      throw error;
    }
  }

  try {
    await githubRequest(
      `/repos/${FRONTEND_REPOSITORY}/actions/workflows/${LIVE_WORKFLOW}/dispatches`,
      token,
      {
        method: 'POST',
        body: {
          ref: FRONTEND_DEFAULT_BRANCH,
          inputs: {
            operation_id: operationId,
            action,
            manifest: JSON.stringify(requests),
            confirmation
          }
        }
      },
      fetchImpl
    );
  } catch (error) {
    if (action === 'deploy') {
      await Promise.allSettled(
        requests.map((request, index) =>
          publishRequestState(
            request,
            'error',
            requestDescription('Dispatch failed', request, index)
          )
        )
      );
    }
    throw error;
  }
  return operationId;
}

export async function requestStop({
  operationId,
  requests,
  runUrl,
  queued = false,
  token,
  fetchImpl = globalThis.fetch
}) {
  for (const request of requests) {
    await githubRequest(
      `/repos/${FRONTEND_REPOSITORY}/statuses/${request.sha}`,
      token,
      {
        method: 'POST',
        body: {
          state: 'pending',
          target_url: runUrl,
          description: 'Stop requested; settling exact operation safely',
          context: `Deploy Hub Stop — ${operationId}`
        }
      },
      fetchImpl
    );
  }
  if (queued) {
    for (const request of requests) {
      await githubRequest(
        `/repos/${FRONTEND_REPOSITORY}/statuses/${request.sha}`,
        token,
        {
          method: 'POST',
          body: {
            state: 'error',
            target_url: runUrl,
            description: request.queueDescription.replace(
              QUEUED_REQUEST_PATTERN,
              'Cancelled $2/$3 for $4 · $5 · $6'
            ),
            context: QUEUED_REQUEST_CONTEXT
          }
        },
        fetchImpl
      );
    }
  }
}

function normalizeStatus(status) {
  return {
    context: status.context,
    createdAt: status.createdAt,
    description: status.description ?? '',
    state: status.state?.toLowerCase() ?? 'pending',
    targetUrl: status.targetUrl ?? ''
  };
}

function targetFromContext(context) {
  const match =
    /^(Deploy Hub(?: Shadow)? — Target): (Staging|Production)$/.exec(context);
  return match?.[2].toLowerCase() ?? '';
}

function queuedRequestFromStatus(status) {
  if (status.context !== QUEUED_REQUEST_CONTEXT || status.state === 'success') {
    return null;
  }
  const match = QUEUED_REQUEST_PATTERN.exec(status.description);
  if (!match) return null;
  return {
    operationId: match[5],
    requestedAt: match[6],
    target: match[4].toLowerCase()
  };
}

function operationIdFromRun(run) {
  const title = run.display_title ?? '';
  if (run.path?.endsWith('/deploy-hub-shadow.yml')) {
    return /^Deploy Hub shadow (.+?) \(/.exec(title)?.[1] ?? '';
  }
  if (run.path?.endsWith('/deploy-hub-production.yml')) {
    return (
      /^Deploy Hub (.+?) — production continuation$/.exec(title)?.[1] ?? ''
    );
  }
  if (run.path?.endsWith('/deploy-hub.yml')) {
    return /^Deploy Hub (.+)$/.exec(title)?.[1] ?? '';
  }
  return '';
}

function operationIdFromEvidenceRun(run, runsById) {
  const direct = operationIdFromRun(run);
  if (direct) return direct;
  const parentRunId = /dh-([1-9]\d*)r[1-9]\d*/.exec(
    run?.display_title ?? ''
  )?.[1];
  return parentRunId ? operationIdFromRun(runsById.get(parentRunId) ?? {}) : '';
}

function latestRun(runs, workflow) {
  return (
    runs
      .filter((run) => run.path?.endsWith(`/${workflow}`))
      .sort((left, right) =>
        (right.created_at ?? '').localeCompare(left.created_at ?? '')
      )[0] ?? null
  );
}

export function buildDashboardModel(repository, runsPayload, refreshedAt) {
  const pulls = repository.pullRequests?.nodes ?? [];
  const runs = runsPayload.workflow_runs ?? [];
  const operationRuns = runs.filter(
    (run) =>
      run.path?.endsWith('/deploy-hub.yml') ||
      run.path?.endsWith('/deploy-hub-production.yml') ||
      run.path?.endsWith('/deploy-hub-shadow.yml')
  );
  const runsByUrl = new Map(runs.map((run) => [run.html_url, run]));
  const runsById = new Map(runs.map((run) => [String(run.id), run]));
  const operationRunsById = new Map(
    operationRuns.map((run) => [operationIdFromRun(run), run])
  );
  const operationsByKey = new Map();

  for (const pull of pulls) {
    const commit = pull.commits?.nodes?.at(-1)?.commit;
    const statuses = (commit?.statusCheckRollup?.contexts?.nodes ?? [])
      .filter((node) => node.__typename === 'StatusContext')
      .map(normalizeStatus);
    const presence = statuses.find(
      (status) => status.context === 'Deploy Hub — Staging Presence'
    );

    for (const status of statuses) {
      const queuedRequest = queuedRequestFromStatus(status);
      const target = queuedRequest?.target ?? targetFromContext(status.context);
      if (!target) continue;
      const queued = Boolean(queuedRequest);
      const candidateRun = queuedRequest
        ? operationRunsById.get(queuedRequest.operationId)
        : runsByUrl.get(status.targetUrl);
      const run =
        queued && candidateRun?.status === 'completed'
          ? null
          : (candidateRun ?? null);
      const operationId =
        queuedRequest?.operationId ??
        (run ? operationIdFromEvidenceRun(run, runsById) : '');
      const key = operationId
        ? `operation:${operationId}`
        : status.targetUrl || `${commit?.oid}:${status.context}`;
      const existing = operationsByKey.get(key) ?? {
        conclusion: queued ? status.state : (run?.conclusion ?? status.state),
        createdAt:
          queuedRequest?.requestedAt ?? run?.created_at ?? status.createdAt,
        id: operationId,
        queued,
        requests: [],
        run,
        runUrl: run?.html_url ?? '',
        shadow: status.context.startsWith('Deploy Hub Shadow'),
        status,
        target,
        terminal: queued
          ? ['error', 'failure'].includes(status.state)
          : run?.status === 'completed' ||
            ['error', 'failure', 'success'].includes(status.state)
      };
      existing.requests.push({
        canRemove:
          pull.state === 'OPEN' &&
          presence?.state === 'success' &&
          target === 'staging',
        pr: pull.number,
        sha: commit?.oid ?? pull.headRefOid,
        state: pull.state,
        title: pull.title,
        url: pull.url,
        ...(queued ? { queueDescription: status.description } : {})
      });
      operationsByKey.set(key, existing);
    }
  }

  for (const run of operationRuns) {
    const operationId = operationIdFromRun(run);
    if (
      [...operationsByKey.values()].some(
        (item) => item.runUrl === run.html_url || item.id === operationId
      )
    ) {
      continue;
    }
    operationsByKey.set(`run:${run.id}`, {
      conclusion: run.conclusion ?? run.status,
      createdAt: run.created_at,
      id: operationId,
      queued: false,
      requests: [],
      run,
      runUrl: run.html_url,
      shadow: run.path?.endsWith('/deploy-hub-shadow.yml'),
      status: null,
      target: '',
      terminal: run.status === 'completed'
    });
  }

  return {
    environments: {
      production: latestRun(runs, 'build-upload-deploy-prod.yml'),
      staging: latestRun(runs, 'deploy-staging.yml')
    },
    operations: [...operationsByKey.values()].sort((left, right) =>
      (right.createdAt ?? '').localeCompare(left.createdAt ?? '')
    ),
    refreshedAt,
    waiting: [...operationsByKey.values()].filter(
      (operation) =>
        (operation.queued && operation.status?.state === 'pending') ||
        ['pending', 'queued', 'waiting'].includes(operation.run?.status)
    ).length
  };
}

export async function readDashboard(
  token,
  fetchImpl = globalThis.fetch,
  now = Date.now
) {
  const [repository, runs] = await Promise.all([
    githubGraphql(token, fetchImpl),
    githubRequest(
      `/repos/${FRONTEND_REPOSITORY}/actions/runs?per_page=100`,
      token,
      {},
      fetchImpl
    )
  ]);
  return buildDashboardModel(repository, runs, new Date(now()).toISOString());
}
