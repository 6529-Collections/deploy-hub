import {
  GitHubOperationError,
  buildActivitySections,
  createOperationId,
  dispatchOperation,
  freezePullRequests,
  listOpenPullRequests,
  readDashboard,
  readPublicDashboard,
  requestStop
} from './github-operations.js';
import {
  GitHubAuthError,
  authenticateGitHubToken,
  forgetToken,
  loadStoredToken,
  storeToken
} from './github-auth.js';

const OPERATOR_REFRESH_INTERVAL_MS = 15_000;
const PUBLIC_REFRESH_INTERVAL_MS = 60_000;
const SITE_DEPLOYMENT_REFRESH_INTERVAL_MS = 60_000;
const MAX_SELECTED_PULL_REQUESTS = 20;
const SITE_VERSION = (() => {
  const value = new globalThis.URL(import.meta.url).searchParams.get('v') ?? '';
  return /^[a-f0-9]{40}$/i.test(value) ? value.toLowerCase() : '';
})();

const elements = {
  activeList: document.querySelector('#active-operations-list'),
  activeSection: document.querySelector('#active-operations-section'),
  accountControl: document.querySelector('#account-control'),
  authDialog: document.querySelector('#auth-dialog'),
  authForm: document.querySelector('#auth-form'),
  authMessage: document.querySelector('#auth-message'),
  authProfile: document.querySelector('#auth-state'),
  closeAuth: document.querySelector('#close-auth'),
  connectButton: document.querySelector('#connect-github'),
  dashboard: document.querySelector('#dashboard'),
  disconnectButton: document.querySelector('#disconnect-github'),
  editOperation: document.querySelector('#edit-operation'),
  loginButton: document.querySelector('#login-github'),
  operationForm: document.querySelector('#operation-form'),
  operationMessage: document.querySelector('#operation-message'),
  operationsPanel: document.querySelector('#operations-panel'),
  prOptions: document.querySelector('#pr-options'),
  prPickerState: document.querySelector('#pr-picker-state'),
  prSearch: document.querySelector('#pr-search'),
  preview: document.querySelector('#request-preview'),
  previewList: document.querySelector('#preview-list'),
  previewTarget: document.querySelector('#preview-target'),
  productionState: document.querySelector('#production-state'),
  queuedBatchesList: document.querySelector('#queued-batches-list'),
  queuedBatchesSection: document.querySelector('#queued-batches-section'),
  queueBadge: document.querySelector('#waiting-state'),
  refreshButton: document.querySelector('#refresh-dashboard'),
  refreshPrs: document.querySelector('#refresh-prs'),
  reviewButton: document.querySelector('#review-operation'),
  recentEmpty: document.querySelector('#recent-operations-empty'),
  recentList: document.querySelector('#recent-operations-list'),
  selectedPrs: document.querySelector('#selected-prs'),
  siteDeploymentStatus: document.querySelector('#site-deployment-status'),
  stagingState: document.querySelector('#staging-state'),
  staleWarning: document.querySelector('#stale-warning'),
  startOperation: document.querySelector('#start-operation'),
  tokenInput: document.querySelector('#github-token')
};

let activeToken = '';
let currentIdentity = null;
let refreshTimer = null;
let dashboardMode = 'public';
let refreshGeneration = 0;
let frozenPreview = null;
let refreshInFlight = false;
let pullRequests = [];
let pullRequestsInFlight = false;
let reviewInFlight = false;
let selectedPrNumbers = [];
let siteDeploymentTimer = null;
let latestSiteDeploymentPresentation = null;
let hasDashboardSnapshot = false;

export function siteDeploymentPresentation(run, currentVersion = SITE_VERSION) {
  const runId = Number(run?.id);
  const runUrl =
    Number.isSafeInteger(runId) && runId > 0
      ? `https://github.com/6529-Collections/deploy-hub/actions/runs/${runId}`
      : '';
  if (!runUrl) return null;
  if (run.status === 'queued' || run.status === 'in_progress') {
    return {
      action: 'View Deployment',
      active: true,
      kind: 'active',
      message: 'Update deploying',
      url: runUrl
    };
  }
  if (run.status !== 'completed') return null;
  if (run.conclusion !== 'success') {
    return {
      action: 'View Deployment',
      active: false,
      kind: 'failed',
      message: 'Latest UI deployment failed',
      url: runUrl
    };
  }
  if (
    currentVersion &&
    /^[a-f0-9]{40}$/i.test(run.head_sha ?? '') &&
    run.head_sha.toLowerCase() !== currentVersion.toLowerCase()
  ) {
    return {
      action: 'Reload',
      active: false,
      kind: 'ready',
      message: 'Update available',
      url: ''
    };
  }
  return null;
}

export function visibleSiteDeploymentPresentation(presentation, authenticated) {
  if (authenticated) return presentation;
  return presentation?.kind === 'ready' ? presentation : null;
}

function renderSiteDeploymentStatus(presentation) {
  elements.siteDeploymentStatus.replaceChildren();
  if (!presentation) {
    elements.siteDeploymentStatus.hidden = true;
    elements.siteDeploymentStatus.removeAttribute('aria-busy');
    return;
  }
  elements.siteDeploymentStatus.className = `site-deployment-status site-deployment-${presentation.kind}`;
  elements.siteDeploymentStatus.setAttribute(
    'aria-busy',
    String(presentation.active)
  );
  const message = document.createElement('span');
  message.textContent = presentation.message;
  let action;
  if (presentation.kind === 'ready') {
    action = document.createElement('button');
    action.type = 'button';
    action.addEventListener('click', () => globalThis.location.reload());
  } else {
    action = document.createElement('a');
    action.href = presentation.url;
    action.target = '_blank';
    action.rel = 'noreferrer';
  }
  action.textContent = presentation.action;
  elements.siteDeploymentStatus.append(message, action);
  elements.siteDeploymentStatus.hidden = false;
}

function scheduleSiteDeploymentRefresh() {
  if (siteDeploymentTimer) globalThis.clearTimeout(siteDeploymentTimer);
  siteDeploymentTimer = globalThis.setTimeout(
    () => void refreshSiteDeploymentStatus(),
    SITE_DEPLOYMENT_REFRESH_INTERVAL_MS
  );
}

async function refreshSiteDeploymentStatus() {
  try {
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (activeToken) headers.Authorization = `Bearer ${activeToken}`;
    const response = await globalThis.fetch(
      'https://api.github.com/repos/6529-Collections/deploy-hub/actions/workflows/deploy-pages.yml/runs?branch=main&per_page=1',
      {
        cache: 'no-store',
        headers
      }
    );
    if (!response.ok) throw new Error('Pages status unavailable.');
    const payload = await response.json();
    const presentation = siteDeploymentPresentation(payload.workflow_runs?.[0]);
    latestSiteDeploymentPresentation = presentation;
    renderSiteDeploymentStatus(
      visibleSiteDeploymentPresentation(presentation, Boolean(currentIdentity))
    );
    scheduleSiteDeploymentRefresh();
  } catch {
    latestSiteDeploymentPresentation = null;
    renderSiteDeploymentStatus(null);
    scheduleSiteDeploymentRefresh();
  }
}

function safeMessage(error, fallback) {
  return error instanceof GitHubOperationError ||
    error instanceof GitHubAuthError
    ? error.message
    : fallback;
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

function startRefreshTimer(interval) {
  clearRefreshTimer();
  refreshTimer = globalThis.setInterval(() => {
    void refreshDashboard();
  }, interval);
}

function beginDashboardMode(mode) {
  dashboardMode = mode;
  refreshGeneration += 1;
  refreshInFlight = false;
  hasDashboardSnapshot = false;
  elements.dashboard.dataset.mode = mode;
}

function openAuthDialog(message = '') {
  elements.authMessage.textContent = message;
  if (!elements.authDialog.open) elements.authDialog.showModal();
  elements.tokenInput.focus();
}

function closeAuthDialog() {
  if (elements.authDialog.open) elements.authDialog.close();
}

function showPublicMode({ refresh = true, revealLogin = true } = {}) {
  clearRefreshTimer();
  beginDashboardMode('public');
  activeToken = '';
  currentIdentity = null;
  frozenPreview = null;
  elements.authProfile.textContent = '';
  elements.accountControl.hidden = true;
  elements.loginButton.hidden = !revealLogin;
  elements.loginButton.disabled = false;
  elements.loginButton.textContent = 'Login';
  renderSiteDeploymentStatus(
    visibleSiteDeploymentPresentation(latestSiteDeploymentPresentation, false)
  );
  elements.dashboard.hidden = false;
  elements.disconnectButton.hidden = true;
  elements.connectButton.disabled = false;
  elements.queueBadge.hidden = true;
  closeAuthDialog();
  showDashboardLoading();
  startRefreshTimer(PUBLIC_REFRESH_INTERVAL_MS);
  if (refresh) void refreshDashboard();
}

function showDashboardLoading() {
  for (const stateElement of [
    elements.stagingState,
    elements.productionState
  ]) {
    stateElement.className =
      'summary-value summary-loading summary-value-disabled';
    stateElement.textContent = 'Loading…';
    stateElement.setAttribute('aria-busy', 'true');
    stateElement.removeAttribute('href');
    stateElement.setAttribute('aria-disabled', 'true');
    stateElement.setAttribute('tabindex', '-1');
  }
  elements.queueBadge.hidden = false;
  elements.queueBadge.textContent = 'Loading…';
  elements.queueBadge.setAttribute('aria-busy', 'true');
  elements.refreshButton.disabled = true;
  elements.operationsPanel.setAttribute('aria-busy', 'true');
  elements.activeSection.hidden = true;
  elements.queuedBatchesSection.hidden = true;
  elements.activeList.replaceChildren();
  elements.queuedBatchesList.replaceChildren();
  elements.recentList.replaceChildren();
  elements.recentEmpty.textContent = 'Loading…';
  elements.recentEmpty.hidden = false;
}

function showSignedIn(identity, token) {
  const mode = identity.operator ? 'operator' : 'viewer';
  beginDashboardMode(mode);
  activeToken = token;
  currentIdentity = identity;
  elements.authProfile.textContent = `@${identity.login}`;
  elements.authProfile.href = `https://github.com/${encodeURIComponent(identity.login)}`;
  elements.authMessage.textContent = '';
  closeAuthDialog();
  elements.accountControl.hidden = false;
  elements.loginButton.hidden = true;
  renderSiteDeploymentStatus(
    visibleSiteDeploymentPresentation(latestSiteDeploymentPresentation, true)
  );
  showDashboardLoading();
  elements.dashboard.hidden = false;
  elements.disconnectButton.hidden = false;
  elements.connectButton.disabled = false;
  elements.tokenInput.value = '';
  startRefreshTimer(OPERATOR_REFRESH_INTERVAL_MS);
  if (identity.operator) void refreshPullRequests({ announce: true });
  void refreshDashboard();
}

async function connect(token, { silent = false } = {}) {
  elements.connectButton.disabled = true;
  elements.loginButton.disabled = true;
  elements.loginButton.textContent = 'Checking…';
  if (!silent) elements.authMessage.textContent = 'Verifying with GitHub…';

  let identity;
  try {
    identity = await authenticateGitHubToken(token);
  } catch (error) {
    if (error instanceof GitHubAuthError && error.code === 'invalid_token') {
      forgetToken(localStorage);
    }
    elements.connectButton.disabled = false;
    elements.loginButton.disabled = false;
    elements.loginButton.hidden = false;
    elements.loginButton.textContent = 'Login';
    if (!silent) {
      elements.authMessage.textContent = safeMessage(
        error,
        'Could not reach GitHub. Try again.'
      );
    }
    return;
  }

  try {
    storeToken(localStorage, token);
    showSignedIn(identity, token.trim());
  } catch {
    elements.connectButton.disabled = false;
    elements.loginButton.disabled = false;
    elements.loginButton.hidden = false;
    elements.loginButton.textContent = 'Login';
    if (!silent) {
      elements.authMessage.textContent =
        'Deploy Hub could not start. Reload the page.';
    }
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

function setEnvironment(run, stateElement) {
  stateElement.className = 'summary-value';
  stateElement.setAttribute('aria-busy', 'false');
  stateElement.replaceChildren();
  if (!run) {
    stateElement.textContent = 'No runs found';
    stateElement.classList.add('summary-value-disabled');
    return;
  }
  const state = run.status === 'completed' ? run.conclusion : run.status;
  const runNumber = Number.isInteger(run.run_number)
    ? `Run #${run.run_number}`
    : '';
  const sha = /^[a-f0-9]{40}$/i.test(run.head_sha ?? '')
    ? run.head_sha.slice(0, 12)
    : '';
  const status = document.createElement('span');
  status.textContent = formatDisplayState(state);
  const separator = document.createElement('span');
  separator.className = 'summary-run-separator';
  separator.textContent = '·';
  separator.setAttribute('aria-hidden', 'true');
  const runLink = document.createElement('a');
  runLink.className = 'summary-run-link';
  runLink.href = run.html_url;
  runLink.target = '_blank';
  runLink.rel = 'noreferrer';
  runLink.textContent = [runNumber, sha].filter(Boolean).join(' - ');
  stateElement.append(status, separator, runLink);
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

function renderOperation(operation, authenticated) {
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
  meta.textContent = `${operation.shadow ? 'Shadow · ' : ''}${operation.target || (authenticated ? 'Target pending' : 'Workflow activity')} · ${formatElapsed(operation.createdAt)}`;
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
      : operation.run
        ? `GitHub Actions: ${formatDisplayState(
            operation.run.status === 'completed'
              ? operation.run.conclusion
              : operation.run.status
          )}`
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
      sha.textContent = `SHA ${request.sha.slice(0, 12)}`;
      copy.append(link, sha);
      row.append(copy);
      if (authenticated && request.canRemove && operation.terminal) {
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
    authenticated &&
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

function renderQueuedBatch(batch, index, canMutate) {
  const group = document.createElement('article');
  group.className = 'batch-group';
  group.setAttribute('role', 'listitem');

  const heading = document.createElement('div');
  heading.className = 'batch-heading';
  const title = document.createElement('h4');
  title.textContent = `Batch ${index + 1} · ${formatDisplayState(batch.target)}`;
  const count = document.createElement('span');
  const requestCount = batch.operations.reduce(
    (total, operation) => total + operation.requests.length,
    0
  );
  count.className = 'batch-count';
  count.textContent = `${requestCount} ${requestCount === 1 ? 'PR' : 'PRs'}`;
  heading.append(title, count);

  const operations = document.createElement('div');
  operations.className = 'batch-operations';
  operations.setAttribute('role', 'list');
  operations.append(
    ...batch.operations.map((operation) =>
      renderOperation(operation, canMutate)
    )
  );
  group.append(heading, operations);
  return group;
}

function renderDashboard(model) {
  const canMutate = dashboardMode === 'operator';
  const activity = buildActivitySections(model.operations);
  setEnvironment(model.environments.staging, elements.stagingState);
  setEnvironment(model.environments.production, elements.productionState);
  elements.queueBadge.hidden = false;
  elements.queueBadge.textContent = `${model.waiting} queued`;
  elements.queueBadge.setAttribute('aria-busy', 'false');
  elements.staleWarning.hidden = true;
  elements.activeList.replaceChildren(
    ...activity.active.map((operation) => renderOperation(operation, canMutate))
  );
  elements.activeSection.hidden = activity.active.length === 0;

  elements.queuedBatchesSection.hidden = activity.batches.length === 0;
  elements.queuedBatchesList.replaceChildren(
    ...activity.batches.map((batch, index) =>
      renderQueuedBatch(batch, index, canMutate)
    )
  );
  elements.recentList.replaceChildren(
    ...activity.recent.map((operation) => renderOperation(operation, canMutate))
  );
  elements.recentEmpty.textContent = 'No completed Deploy Hub operations yet.';
  elements.recentEmpty.hidden = activity.recent.length > 0;
  hasDashboardSnapshot = true;
}

export function dashboardFailurePresentation(error, hasSnapshot) {
  if (hasSnapshot) {
    return {
      message: 'Refresh failed. Showing the last complete GitHub snapshot.',
      state: ''
    };
  }
  const rateLimited =
    error instanceof GitHubOperationError && error.code === 'rate_limited';
  return {
    message: rateLimited
      ? 'GitHub rate limit reached. Log in or try again later.'
      : 'Could not load GitHub data. Try again.',
    state: rateLimited ? 'Rate Limit Reached' : 'Unavailable'
  };
}

function renderDashboardFailure(error) {
  const presentation = dashboardFailurePresentation(
    error,
    hasDashboardSnapshot
  );
  elements.staleWarning.textContent = presentation.message;
  elements.staleWarning.hidden = false;
  if (!presentation.state) return;
  for (const stateElement of [
    elements.stagingState,
    elements.productionState
  ]) {
    stateElement.className = 'summary-value summary-value-disabled';
    stateElement.textContent = presentation.state;
    stateElement.setAttribute('aria-busy', 'false');
    stateElement.removeAttribute('href');
    stateElement.setAttribute('aria-disabled', 'true');
    stateElement.setAttribute('tabindex', '-1');
  }
  elements.activeList.replaceChildren();
  elements.activeSection.hidden = true;
  elements.queuedBatchesSection.hidden = true;
  elements.queuedBatchesList.replaceChildren();
  elements.recentList.replaceChildren();
  elements.recentEmpty.textContent = presentation.message;
  elements.recentEmpty.hidden = false;
}

async function refreshDashboard() {
  if (refreshInFlight) return;
  const generation = refreshGeneration;
  const token = activeToken;
  const mode = dashboardMode;
  refreshInFlight = true;
  elements.refreshButton.disabled = true;
  elements.operationsPanel.setAttribute('aria-busy', 'true');
  try {
    const model =
      mode !== 'public'
        ? await readDashboard(token)
        : await readPublicDashboard();
    if (generation === refreshGeneration) renderDashboard(model);
  } catch (error) {
    if (generation !== refreshGeneration) return;
    renderDashboardFailure(error);
    if (
      mode !== 'public' &&
      error instanceof GitHubOperationError &&
      error.status === 401
    ) {
      forgetToken(localStorage);
      showPublicMode();
      openAuthDialog('GitHub rejected the stored token. Connect again.');
    }
  } finally {
    if (generation === refreshGeneration) {
      refreshInFlight = false;
      elements.refreshButton.disabled = false;
      elements.operationsPanel.setAttribute('aria-busy', 'false');
    }
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

elements.loginButton.addEventListener('click', () => {
  openAuthDialog();
});

elements.closeAuth.addEventListener('click', closeAuthDialog);

elements.disconnectButton.addEventListener('click', () => {
  forgetToken(localStorage);
  showPublicMode();
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
  void refreshDashboard();
});

elements.refreshPrs.addEventListener('click', () => {
  void refreshPullRequests({ announce: true });
});

elements.prSearch.addEventListener('input', renderPullRequests);

const storedToken = loadStoredToken(localStorage);
showPublicMode({ refresh: !storedToken, revealLogin: !storedToken });
void refreshSiteDeploymentStatus();
if (storedToken) {
  void connect(storedToken, { silent: true });
}
