import {
  GitHubOperationError,
  createOperationId,
  dispatchOperation,
  freezePullRequests,
  listOpenPullRequests,
  readDashboard,
  requestStop
} from './github-operations.js';
import {
  GitHubAuthError,
  authenticateGitHubToken,
  forgetToken,
  loadStoredToken,
  storeToken
} from './github-auth.js';

const REFRESH_INTERVAL_MS = 5_000;
const MAX_SELECTED_PULL_REQUESTS = 20;

const elements = {
  authBadge: document.querySelector('#auth-state'),
  authForm: document.querySelector('#auth-form'),
  authMessage: document.querySelector('#auth-message'),
  authPanel: document.querySelector('#auth-panel'),
  connectButton: document.querySelector('#connect-github'),
  dashboard: document.querySelector('#dashboard'),
  editOperation: document.querySelector('#edit-operation'),
  forgetButton: document.querySelector('#forget-github'),
  operationForm: document.querySelector('#operation-form'),
  operationMessage: document.querySelector('#operation-message'),
  operationsEmpty: document.querySelector('#operations-empty'),
  operationsList: document.querySelector('#operations-list'),
  operationsPanel: document.querySelector('#operations-panel'),
  prOptions: document.querySelector('#pr-options'),
  prPickerState: document.querySelector('#pr-picker-state'),
  prSearch: document.querySelector('#pr-search'),
  preview: document.querySelector('#request-preview'),
  previewList: document.querySelector('#preview-list'),
  previewTarget: document.querySelector('#preview-target'),
  productionLink: document.querySelector('#production-link'),
  productionState: document.querySelector('#production-state'),
  refreshButton: document.querySelector('#refresh-dashboard'),
  refreshPrs: document.querySelector('#refresh-prs'),
  refreshState: document.querySelector('#refresh-state'),
  reviewButton: document.querySelector('#review-operation'),
  selectedPrs: document.querySelector('#selected-prs'),
  sessionPanel: document.querySelector('#session-panel'),
  stagingLink: document.querySelector('#staging-link'),
  stagingState: document.querySelector('#staging-state'),
  staleWarning: document.querySelector('#stale-warning'),
  startOperation: document.querySelector('#start-operation'),
  tokenInput: document.querySelector('#github-token'),
  waitingCount: document.querySelector('#waiting-count')
};

let activeToken = '';
let currentIdentity = null;
let refreshTimer = null;
let frozenPreview = null;
let refreshInFlight = false;
let pullRequests = [];
let pullRequestsInFlight = false;
let reviewInFlight = false;
let selectedPrNumbers = [];

function safeMessage(error, fallback) {
  return error instanceof GitHubOperationError ||
    error instanceof GitHubAuthError
    ? error.message
    : fallback;
}

function formatDate(value) {
  if (!value) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatElapsed(value) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value ?? '')) / 1000)
  );
  if (!Number.isFinite(elapsedSeconds)) return 'elapsed time unavailable';
  if (elapsedSeconds < 60) return `${elapsedSeconds}s elapsed`;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m elapsed`;
  return `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m elapsed`;
}

export function formatDisplayState(value) {
  return String(value ?? 'unknown')
    .toLowerCase()
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function clearRefreshTimer() {
  if (refreshTimer) globalThis.clearInterval(refreshTimer);
  refreshTimer = null;
}

function showSignedOut(message = '') {
  clearRefreshTimer();
  activeToken = '';
  currentIdentity = null;
  frozenPreview = null;
  elements.sessionPanel.hidden = true;
  elements.authBadge.textContent = 'Not connected';
  elements.authMessage.textContent = message;
  elements.authPanel.hidden = false;
  elements.dashboard.hidden = true;
  elements.forgetButton.hidden = true;
  elements.connectButton.disabled = false;
  elements.tokenInput.focus();
}

function showDashboardLoading() {
  for (const [stateElement, linkElement] of [
    [elements.stagingState, elements.stagingLink],
    [elements.productionState, elements.productionLink]
  ]) {
    stateElement.className = 'summary-value summary-loading';
    stateElement.textContent = 'Loading…';
    stateElement.setAttribute('aria-busy', 'true');
    linkElement.hidden = true;
  }
  elements.waitingCount.textContent = '…';
  elements.refreshState.textContent = 'Loading GitHub…';
  elements.operationsList.replaceChildren();
  elements.operationsEmpty.textContent = 'Loading…';
  elements.operationsEmpty.hidden = false;
}

function showSignedIn(identity, token) {
  activeToken = token;
  currentIdentity = identity;
  elements.sessionPanel.hidden = true;
  elements.authBadge.textContent = `@${identity.login}`;
  elements.authMessage.textContent = '';
  elements.authPanel.hidden = true;
  showDashboardLoading();
  elements.dashboard.hidden = false;
  elements.forgetButton.hidden = false;
  elements.connectButton.disabled = false;
  elements.tokenInput.value = '';
  elements.prSearch.focus();
  clearRefreshTimer();
  refreshTimer = globalThis.setInterval(() => {
    void refreshDashboard();
  }, REFRESH_INTERVAL_MS);
  void refreshPullRequests({ announce: true });
  void refreshDashboard({ announce: true });
}

async function connect(token) {
  elements.connectButton.disabled = true;
  elements.authBadge.textContent = 'Checking';
  elements.authMessage.textContent = 'Verifying with GitHub…';

  try {
    const identity = await authenticateGitHubToken(token);
    storeToken(localStorage, token);
    showSignedIn(identity, token.trim());
  } catch (error) {
    if (
      error instanceof GitHubAuthError &&
      ['invalid_token', 'insufficient_scope', 'not_operator'].includes(
        error.code
      )
    ) {
      forgetToken(localStorage);
    }
    showSignedOut(
      safeMessage(error, 'GitHub authentication is temporarily unavailable.')
    );
  }
}

function updateSelectedPrs() {
  const noSelection = selectedPrNumbers.length === 0;
  elements.selectedPrs.textContent = noSelection
    ? 'None selected'
    : `Deployment order: ${selectedPrNumbers.map((pr) => `#${pr}`).join(' → ')}`;
  elements.reviewButton.disabled = noSelection || reviewInFlight;
  if (noSelection) {
    elements.operationMessage.textContent =
      'Select at least one open pull request.';
  } else if (
    elements.operationMessage.textContent ===
    'Select at least one open pull request.'
  ) {
    elements.operationMessage.textContent = '';
  }
}

function renderPullRequests() {
  const query = elements.prSearch.value.trim().toLowerCase();
  const visible = pullRequests.filter((pull) =>
    [pull.number, pull.branch, pull.title, pull.author]
      .join(' ')
      .toLowerCase()
      .includes(query)
  );

  elements.prOptions.replaceChildren(
    ...visible.map((pull) => {
      const label = document.createElement('label');
      label.className = 'pr-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selectedPrNumbers.includes(pull.number);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (selectedPrNumbers.length >= MAX_SELECTED_PULL_REQUESTS) {
            checkbox.checked = false;
            elements.operationMessage.textContent =
              'Select at most 20 pull requests.';
            return;
          }
          if (!selectedPrNumbers.includes(pull.number)) {
            selectedPrNumbers.push(pull.number);
          }
        } else {
          selectedPrNumbers = selectedPrNumbers.filter(
            (number) => number !== pull.number
          );
        }
        updateSelectedPrs();
      });

      const copy = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = `#${pull.number} · ${pull.title}`;
      const details = document.createElement('small');
      details.textContent = `${pull.branch} · @${pull.author}`;
      copy.append(title, details);
      label.append(checkbox, copy);
      return label;
    })
  );

  elements.prPickerState.textContent =
    visible.length === 0
      ? query
        ? 'No open PRs match this search.'
        : 'No open frontend PRs found.'
      : `${visible.length} open PR${visible.length === 1 ? '' : 's'}`;
  updateSelectedPrs();
}

async function refreshPullRequests({ announce = false } = {}) {
  if (!activeToken || pullRequestsInFlight) return;
  pullRequestsInFlight = true;
  elements.refreshPrs.disabled = true;
  if (announce) elements.prPickerState.textContent = 'Loading open PRs…';
  try {
    pullRequests = await listOpenPullRequests({ token: activeToken });
    const available = new Set(pullRequests.map(({ number }) => number));
    selectedPrNumbers = selectedPrNumbers.filter((number) =>
      available.has(number)
    );
    renderPullRequests();
  } catch (error) {
    elements.prPickerState.textContent = safeMessage(
      error,
      'Unable to load open pull requests.'
    );
  } finally {
    pullRequestsInFlight = false;
    elements.refreshPrs.disabled = false;
  }
}

function setEnvironment(run, stateElement, linkElement) {
  stateElement.className = 'summary-value';
  stateElement.setAttribute('aria-busy', 'false');
  if (!run) {
    stateElement.textContent = 'No recent run';
    linkElement.hidden = true;
    return;
  }
  const state = run.status === 'completed' ? run.conclusion : run.status;
  stateElement.textContent = `${formatDisplayState(state)} · ${run.head_sha?.slice(0, 12) ?? 'SHA pending'}`;
  linkElement.href = run.html_url;
  linkElement.hidden = false;
}

function makeButton(label, className, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function appendRunLink(container, operation) {
  if (!operation.runUrl) return;
  const link = document.createElement('a');
  link.className = 'inline-link';
  link.href = operation.runUrl;
  link.rel = 'noreferrer';
  link.target = '_blank';
  const path = operation.run?.path ?? '';
  if (path.endsWith('/staging-e2e.yml')) {
    link.textContent = 'Open staging E2E evidence';
  } else if (path.endsWith('/production-e2e.yml')) {
    link.textContent = 'Open production E2E evidence';
  } else if (path.endsWith('/deploy-staging.yml')) {
    link.textContent = 'Open staging deploy and runtime proof';
  } else if (path.endsWith('/build-upload-deploy-prod.yml')) {
    link.textContent = 'Open production deploy and runtime proof';
  } else {
    link.textContent = 'Open authoritative run';
  }
  container.append(link);
}

async function stopOperation(operation, button) {
  if (!globalThis.confirm(`Stop Deploy Hub operation ${operation.id}?`)) return;
  button.disabled = true;
  try {
    await requestStop({
      operationId: operation.id,
      requests: operation.requests,
      runUrl: operation.runUrl || operation.status?.targetUrl,
      queued: operation.queued,
      token: activeToken
    });
    elements.operationMessage.textContent =
      'Stop requested. The workflow will cancel before mutation or settle safely.';
    await refreshDashboard();
  } catch (error) {
    elements.operationMessage.textContent = safeMessage(
      error,
      'Unable to request Stop.'
    );
  } finally {
    button.disabled = false;
  }
}

async function removeRequest(request, button) {
  if (
    !globalThis.confirm(
      `Remove exact PR #${request.pr} (${request.sha.slice(0, 12)}) from staging?`
    )
  ) {
    return;
  }
  button.disabled = true;
  const operationId = createOperationId();
  try {
    await dispatchOperation({
      action: 'remove-from-staging',
      operationId,
      requests: [
        {
          pr: request.pr,
          repository: '6529-Collections/6529seize-frontend',
          requested_at: new Date().toISOString(),
          requester: currentIdentity.login,
          sha: request.sha,
          target: 'staging'
        }
      ],
      token: activeToken
    });
    elements.operationMessage.textContent = `Removal ${operationId} submitted.`;
  } catch (error) {
    elements.operationMessage.textContent = safeMessage(
      error,
      'Unable to start staging removal.'
    );
  } finally {
    button.disabled = false;
  }
}

function renderOperation(operation) {
  const card = document.createElement('article');
  const state = operation.status?.state ?? operation.run?.status ?? 'pending';
  card.className = 'operation-card';
  card.dataset.state = state;
  card.setAttribute('role', 'listitem');

  const top = document.createElement('div');
  top.className = 'operation-top';
  const heading = document.createElement('div');
  const title = document.createElement('p');
  title.className = 'operation-title';
  title.textContent = operation.id
    ? `Operation ${operation.id}`
    : 'Deploy Hub operation';
  const meta = document.createElement('p');
  meta.className = 'operation-meta';
  meta.textContent = `${operation.shadow ? 'Shadow · ' : ''}${operation.target || 'Target pending'} · ${formatElapsed(operation.createdAt)}`;
  heading.append(title, meta);
  const badge = document.createElement('span');
  badge.className = 'operation-badge';
  badge.textContent = formatDisplayState(operation.conclusion ?? state);
  top.append(heading, badge);
  card.append(top);

  const status = document.createElement('p');
  status.className = 'operation-status';
  status.textContent =
    operation.status?.description ||
    (operation.run?.status === 'queued'
      ? 'Queued in GitHub Actions'
      : 'Waiting for PR status projection');
  card.append(status);

  if (operation.requests.length > 0) {
    const requests = document.createElement('div');
    requests.className = 'operation-requests';
    for (const request of operation.requests) {
      const row = document.createElement('div');
      row.className = 'request-row';
      const copy = document.createElement('div');
      copy.className = 'request-copy';
      const link = document.createElement('a');
      link.className = 'request-link';
      link.href = request.url;
      link.rel = 'noreferrer';
      link.target = '_blank';
      link.textContent = `PR #${request.pr} · ${request.title}`;
      const sha = document.createElement('span');
      sha.className = 'sha';
      sha.textContent = request.sha.slice(0, 12);
      copy.append(link, sha);
      row.append(copy);
      if (request.canRemove && operation.terminal) {
        const removeButton = makeButton(
          'Remove from staging',
          'button button-danger button-small',
          (event) => void removeRequest(request, event.currentTarget)
        );
        row.append(removeButton);
      }
      requests.append(row);
    }
    card.append(requests);
  }

  const actions = document.createElement('div');
  actions.className = 'operation-actions';
  appendRunLink(actions, operation);
  if (
    !operation.shadow &&
    !operation.terminal &&
    operation.id &&
    (operation.runUrl || operation.queued) &&
    operation.requests.length > 0
  ) {
    const stopButton = makeButton(
      'Stop',
      'button button-danger button-small',
      (event) => void stopOperation(operation, event.currentTarget)
    );
    actions.append(stopButton);
  }
  card.append(actions);
  return card;
}

function renderDashboard(model) {
  setEnvironment(
    model.environments.staging,
    elements.stagingState,
    elements.stagingLink
  );
  setEnvironment(
    model.environments.production,
    elements.productionState,
    elements.productionLink
  );
  elements.waitingCount.textContent = String(model.waiting);
  elements.refreshState.textContent = `Updated ${formatDate(model.refreshedAt)}`;
  elements.staleWarning.hidden = true;
  elements.operationsList.replaceChildren(
    ...model.operations.map(renderOperation)
  );
  elements.operationsEmpty.textContent = 'No Deploy Hub operations found yet.';
  elements.operationsEmpty.hidden = model.operations.length > 0;
}

async function refreshDashboard({ announce = false } = {}) {
  if (!activeToken || refreshInFlight) return;
  refreshInFlight = true;
  elements.refreshButton.disabled = true;
  elements.operationsPanel.setAttribute('aria-busy', 'true');
  if (announce) elements.refreshState.textContent = 'Reading GitHub truth…';
  try {
    renderDashboard(await readDashboard(activeToken));
  } catch (error) {
    elements.staleWarning.hidden = false;
    elements.refreshState.textContent = 'Snapshot stale';
    if (error instanceof GitHubOperationError && error.status === 401) {
      forgetToken(localStorage);
      showSignedOut('GitHub rejected the stored token. Connect again.');
    }
  } finally {
    refreshInFlight = false;
    elements.refreshButton.disabled = false;
    elements.operationsPanel.setAttribute('aria-busy', 'false');
  }
}

function showOperationForm() {
  frozenPreview = null;
  elements.operationForm.hidden = false;
  elements.preview.hidden = true;
  elements.prSearch.focus();
}

function renderFrozenPreview(items, target) {
  elements.previewTarget.textContent =
    target === 'production' ? 'Target: Production' : 'Target: Staging';
  elements.startOperation.textContent =
    target === 'production'
      ? 'Start production operation'
      : 'Start staging operation';
  elements.previewList.replaceChildren(
    ...items.map((item) => {
      const row = document.createElement('li');
      const link = document.createElement('a');
      link.href = item.url;
      link.rel = 'noreferrer';
      link.target = '_blank';
      link.textContent = `PR #${item.manifest.pr} · ${item.title}`;
      const sha = document.createElement('div');
      sha.className = 'sha';
      sha.textContent = `Exact head ${item.manifest.sha}`;
      row.append(link, sha);
      return row;
    })
  );
  elements.operationForm.hidden = true;
  elements.preview.hidden = false;
  elements.previewTarget.focus();
}

elements.authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void connect(elements.tokenInput.value);
});

elements.forgetButton.addEventListener('click', () => {
  forgetToken(localStorage);
  showSignedOut('GitHub token forgotten.');
});

elements.operationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (selectedPrNumbers.length === 0) {
    elements.operationMessage.textContent =
      'Select at least one open pull request.';
    elements.prSearch.focus();
    return;
  }
  reviewInFlight = true;
  updateSelectedPrs();
  elements.operationMessage.textContent = 'Freezing exact PR heads…';
  try {
    const target = new globalThis.FormData(elements.operationForm).get(
      'target'
    );
    const items = await freezePullRequests({
      prNumbers: selectedPrNumbers,
      requester: currentIdentity.login,
      target,
      token: activeToken
    });
    frozenPreview = { items, target };
    renderFrozenPreview(items, target);
    elements.operationMessage.textContent =
      'Review the immutable PR heads before starting.';
  } catch (error) {
    elements.operationMessage.textContent = safeMessage(
      error,
      'Unable to freeze these PRs.'
    );
  } finally {
    reviewInFlight = false;
    updateSelectedPrs();
  }
});

elements.editOperation.addEventListener('click', showOperationForm);

elements.startOperation.addEventListener('click', async () => {
  if (!frozenPreview) return;
  elements.startOperation.disabled = true;
  const operationId = createOperationId();
  try {
    await dispatchOperation({
      operationId,
      requests: frozenPreview.items.map(({ manifest }) => manifest),
      token: activeToken
    });
    elements.operationMessage.textContent = `Operation ${operationId} submitted to GitHub.`;
    selectedPrNumbers = [];
    elements.operationForm.reset();
    renderPullRequests();
    showOperationForm();
    await refreshDashboard();
  } catch (error) {
    elements.operationMessage.textContent = safeMessage(
      error,
      'Unable to submit this operation.'
    );
  } finally {
    elements.startOperation.disabled = false;
  }
});

elements.refreshButton.addEventListener('click', () => {
  void refreshDashboard({ announce: true });
});

elements.refreshPrs.addEventListener('click', () => {
  void refreshPullRequests({ announce: true });
});

elements.prSearch.addEventListener('input', renderPullRequests);

const storedToken = loadStoredToken(localStorage);
if (storedToken) {
  void connect(storedToken);
} else {
  showSignedOut();
}
