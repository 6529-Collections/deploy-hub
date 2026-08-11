import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

import { GitHubOperationError } from '../ui/github-operations.js';

const UI_ROOT = new URL('../ui/', import.meta.url);

async function readUiFile(path) {
  return readFile(new URL(path, UI_ROOT), 'utf8');
}

class UiElement {
  constructor() {
    this.attributes = new Map();
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      contains: (name) => classes.has(name),
      remove: (...names) => names.forEach((name) => classes.delete(name))
    };
    this.dataset = {};
    this.disabled = false;
    this.focused = false;
    this.hidden = false;
    this.listeners = new Map();
    this.open = false;
    this.textContent = '';
    this.value = '';
  }

  append() {}

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  focus() {
    this.focused = true;
  }

  close() {
    this.open = false;
  }

  replaceChildren() {}

  showModal() {
    this.open = true;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
}

test('browser entry module initializes the public read-only UI without a server', async () => {
  const elements = new Map();
  const documentDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'document'
  );
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage'
  );
  const fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  const setIntervalDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'setInterval'
  );
  const setTimeoutDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'setTimeout'
  );

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement() {
        return new UiElement();
      },
      querySelector(selector) {
        if (!elements.has(selector)) elements.set(selector, new UiElement());
        return elements.get(selector);
      }
    }
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      removeItem() {},
      setItem() {}
    }
  });
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: () => new Promise(() => {})
  });
  Object.defineProperty(globalThis, 'setInterval', {
    configurable: true,
    value: () => 1
  });
  Object.defineProperty(globalThis, 'setTimeout', {
    configurable: true,
    value: () => 1
  });

  try {
    const app = await import(new URL(`app.js?test=${Date.now()}`, UI_ROOT));

    assert.equal(elements.get('#auth-state').textContent, '');
    assert.equal(elements.get('#account-control').hidden, true);
    assert.equal(elements.get('#auth-dialog').open, false);
    assert.equal(elements.get('#dashboard').hidden, false);
    assert.equal(elements.get('#dashboard').dataset.mode, 'public');
    assert.equal(elements.get('#disconnect-github').hidden, true);
    assert.equal(elements.get('#login-github').hidden, false);
    assert.equal(elements.get('#site-deployment-status').hidden, true);
    assert.equal(elements.get('#waiting-state').hidden, false);
    assert.equal(elements.get('#waiting-state').textContent, 'Loading…');
    assert.equal(elements.get('#github-token').focused, false);
    elements.get('#login-github').listeners.get('click')();
    assert.equal(elements.get('#auth-dialog').open, true);
    assert.equal(elements.get('#github-token').focused, true);
    elements.get('#close-auth').listeners.get('click')();
    assert.equal(elements.get('#auth-dialog').open, false);
    assert.equal(app.formatDisplayState('queued'), 'Queued');
    assert.equal(app.formatDisplayState('in_progress'), 'In Progress');
    assert.equal(app.formatDisplayState('action_required'), 'Action Required');
    assert.equal(app.formatDisplayState('failure'), 'Failure');
    assert.deepEqual(
      app.dashboardFailurePresentation(
        new GitHubOperationError(
          'rate_limited',
          'GitHub rate limit reached.',
          403
        ),
        false
      ),
      {
        message: 'GitHub rate limit reached. Log in or try again later.',
        state: 'Rate Limit Reached'
      }
    );
    assert.deepEqual(
      app.dashboardFailurePresentation(new Error('offline'), true),
      {
        message: 'Refresh failed. Showing the last complete GitHub snapshot.',
        state: ''
      }
    );
    assert.deepEqual(
      app.siteDeploymentPresentation({ id: 123, status: 'in_progress' }),
      {
        action: 'View Deployment',
        active: true,
        kind: 'active',
        message: 'Update deploying',
        url: 'https://github.com/6529-Collections/deploy-hub/actions/runs/123'
      }
    );
    assert.deepEqual(
      app.siteDeploymentPresentation(
        {
          conclusion: 'success',
          head_sha: 'b'.repeat(40),
          id: 124,
          status: 'completed'
        },
        'a'.repeat(40)
      ),
      {
        action: 'Reload',
        active: false,
        kind: 'ready',
        message: 'Update available',
        url: ''
      }
    );
    const activeDeployment = app.siteDeploymentPresentation({
      id: 125,
      status: 'queued'
    });
    const availableUpdate = app.siteDeploymentPresentation(
      {
        conclusion: 'success',
        head_sha: 'c'.repeat(40),
        id: 126,
        status: 'completed'
      },
      'a'.repeat(40)
    );
    assert.equal(
      app.visibleSiteDeploymentPresentation(activeDeployment, false),
      null
    );
    assert.equal(
      app.visibleSiteDeploymentPresentation(availableUpdate, false),
      availableUpdate
    );
    assert.equal(
      app.visibleSiteDeploymentPresentation(activeDeployment, true),
      activeDeployment
    );
  } finally {
    if (documentDescriptor) {
      Object.defineProperty(globalThis, 'document', documentDescriptor);
    } else {
      delete globalThis.document;
    }
    if (localStorageDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor);
    } else {
      delete globalThis.localStorage;
    }
    if (fetchDescriptor) {
      Object.defineProperty(globalThis, 'fetch', fetchDescriptor);
    } else {
      delete globalThis.fetch;
    }
    if (setIntervalDescriptor) {
      Object.defineProperty(globalThis, 'setInterval', setIntervalDescriptor);
    } else {
      delete globalThis.setInterval;
    }
    if (setTimeoutDescriptor) {
      Object.defineProperty(globalThis, 'setTimeout', setTimeoutDescriptor);
    } else {
      delete globalThis.setTimeout;
    }
  }
});

test('browser entry module references elements that exist exactly once', async () => {
  const [app, html] = await Promise.all([
    readUiFile('app.js'),
    readUiFile('index.html')
  ]);
  const ids = [
    ...app.matchAll(/document\.querySelector\('#([a-z0-9-]+)'\)/g)
  ].map((match) => match[1]);

  assert.ok(ids.length > 0);
  for (const id of ids) {
    const matches = html.match(new RegExp(`\\bid="${id}"`, 'g')) ?? [];
    assert.equal(matches.length, 1, `Expected one #${id} element`);
  }
});

test('forms and live interaction surfaces expose accessible relationships', async () => {
  const [app, html] = await Promise.all([
    readUiFile('app.js'),
    readUiFile('index.html')
  ]);

  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>6529 Deploy Hub<\/title>/);
  assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /name="application-name" content="6529 Deploy Hub"/);
  assert.match(
    html,
    /name="apple-mobile-web-app-title" content="6529 Deploy Hub"/
  );
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<h1>6529 Deploy Hub<\/h1>/);
  assert.match(
    html,
    /id="site-deployment-status"[\s\S]*?aria-live="polite"[\s\S]*?hidden/
  );
  assert.match(
    html,
    /class="header-actions"[\s\S]*?id="site-deployment-status"[\s\S]*?id="login-github"/
  );
  assert.doesNotMatch(html, /6529 engineering/i);
  assert.match(html, /for="github-token"/);
  assert.match(html, /<h2 id="auth-title">Connect GitHub<\/h2>/);
  assert.match(html, /<dialog[^>]+id="auth-dialog"/);
  assert.match(html, /id="login-github"[\s\S]*?>[\s\S]*?Login/);
  assert.match(
    html.match(/<button(?=[^>]*id="login-github")[^>]*>/)?.[0] ?? '',
    /hidden/
  );
  assert.match(html, /class="button button-quiet header-login"/);
  assert.match(app, /visibleSiteDeploymentPresentation/);
  assert.doesNotMatch(
    app,
    /function showSignedIn[\s\S]*?elements\.prSearch\.focus\(\);[\s\S]*?function connect/
  );
  assert.match(html, /id="close-auth"[\s\S]*?aria-label="Close login"/);
  assert.match(html, /for="pr-search"/);
  assert.match(html, /id="pr-search"[\s\S]*aria-describedby="pr-search-help"/);
  assert.match(html, /<fieldset>[\s\S]*<legend>Final target<\/legend>/);
  assert.match(html, /id="auth-message" role="status"/);
  assert.match(
    html,
    /id="disconnect-github"[\s\S]*?aria-label="Disconnect GitHub"/
  );
  assert.match(
    html,
    /id="operation-message" role="status">[\s\S]*?Select at least one open pull request\./
  );
  assert.match(
    html.match(/<button(?=[^>]*id="review-operation")[^>]*>/)?.[0] ?? '',
    /disabled/
  );
  assert.match(
    app,
    /elements\.reviewButton\.disabled = noSelection \|\| reviewInFlight/
  );
  assert.match(html, /id="staging-state"[\s\S]*?Loading…/);
  assert.match(html, /id="production-state"[\s\S]*?Loading…/);
  assert.match(html, /aria-hidden="true">🚧<\/span>/);
  assert.match(html, /aria-hidden="true">🚀<\/span>/);
  assert.match(html, /aria-hidden="true">📥<\/span>/);
  assert.match(
    html,
    /id="waiting-state"[\s\S]*?aria-busy="true"[\s\S]*?Loading…/
  );
  assert.doesNotMatch(html, /id="(?:staging|production)-state">No recent run/);
  assert.doesNotMatch(html, /Reading GitHub truth|Loading GitHub/);
  assert.doesNotMatch(html, /GitHub truth/i);
  assert.match(html, /<p class="eyebrow">Deployment activity<\/p>/);
  assert.match(html, /<h2 id="operations-title">Operations<\/h2>/);
  assert.match(
    html,
    /id="refresh-dashboard"[\s\S]*?aria-label="Refresh operations"[\s\S]*?<svg[\s\S]*?aria-hidden="true"/
  );
  assert.match(
    html,
    /id="staging-state"[\s\S]*?aria-busy="true"[\s\S]*?Loading…/
  );
  assert.match(
    html,
    /id="production-state"[\s\S]*?aria-busy="true"[\s\S]*?Loading…/
  );
  assert.match(
    html,
    /actions\/workflows\/deploy-staging\.yml[\s\S]*?View Workflow/
  );
  assert.match(
    html,
    /actions\/workflows\/build-upload-deploy-prod\.yml[\s\S]*?View Workflow/
  );
  assert.doesNotMatch(html, /Open latest run|View workflow/);
  assert.equal(
    (html.match(/<p class="summary-label">Latest run<\/p>/g) ?? []).length,
    2
  );
  assert.match(html, /id="operations-panel"[\s\S]*aria-busy="false"/);
  assert.match(html, /id="refresh-state" hidden/);
  assert.match(
    html,
    /<h3 id="active-operations-title">Active Deployment<\/h3>/
  );
  assert.match(html, /id="active-operations-section"[\s\S]*?hidden/);
  assert.match(html, /<h3 id="queued-batches-title">Queued Batches<\/h3>/);
  assert.match(html, /id="queued-batches-section"[\s\S]*?hidden/);
  assert.match(
    html,
    /<h3 id="recent-operations-title">Recent Operations<\/h3>/
  );
  assert.match(html, /id="active-operations-list"[\s\S]*role="list"/);
  assert.match(html, /id="queued-batches-list"[\s\S]*role="list"/);
  assert.match(html, /id="recent-operations-list"[\s\S]*role="list"/);
  assert.doesNotMatch(html, /No active deployment|No queued batches/);
  assert.doesNotMatch(html, /tabindex="[1-9]/);
});

test('links, images, buttons, and local modules use safe static markup', async () => {
  const html = await readUiFile('index.html');

  for (const tag of html.match(/<a\b[\s\S]*?<\/a>/g) ?? []) {
    if (tag.includes('target="_blank"')) {
      assert.match(tag, /rel="noreferrer"/);
    }
  }
  for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
    assert.match(tag, /\balt="[^"]*"/);
  }
  for (const tag of html.match(/<button\b[^>]*>/g) ?? []) {
    assert.match(tag, /\btype="(?:button|submit)"/);
  }

  assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /<footer|deploy-hub-commit|source-sha/);
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)="https?:/i);
});

test('keyboard focus, reduced motion, and readable muted copy stay enforced', async () => {
  const css = await readUiFile('styles.css');

  assert.match(css, /:focus-visible/);
  assert.match(css, /\.target-option:focus-within/);
  assert.match(css, /\.summary-loading::before/);
  assert.match(css, /\.site-deployment-active::before/);
  assert.match(
    css,
    /\.site-deployment-status > span\s*{[\s\S]*?margin-right: auto;[\s\S]*?text-align: left;/
  );
  assert.match(css, /\.summary-workflow-link\s*{[\s\S]*?margin-left: auto;/);
  assert.match(css, /\.summary-run-link\s*{[\s\S]*?color: #93c5fd;/);
  assert.match(css, /\.summary-value\s*{[\s\S]*?column-gap: 0\.3em;/);
  assert.match(css, /\.summary-run-link:hover/);
  assert.match(css, /\.summary-card\s*{[\s\S]*?padding: 16px 20px;/);
  assert.doesNotMatch(css, /\.summary-card\s*{[^}]*min-height:/);
  assert.match(
    css,
    /\.summary-value-disabled\s*{[\s\S]*?pointer-events: none;/
  );
  assert.match(css, /box-shadow: 0 0 0 1px rgb\(96 165 250 \/ 20%\);/);
  assert.doesNotMatch(css, /input:focus-visible|textarea:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(
    css,
    /\.operations-panel\[aria-busy='true'\] \.button-icon svg\s*{[\s\S]*?animation: session-spin/
  );
  assert.match(css, /\.field-hint\s*{[\s\S]*?color: #94a3b8;/);
  assert.doesNotMatch(css, /footer\s*{/);
});

test('desktop layout stays aligned and the visual shell stays neutral black', async () => {
  const css = await readUiFile('styles.css');

  assert.match(
    css,
    /\.summary-grid\s*{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/
  );
  assert.match(
    css,
    /\.workspace-grid\s*{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/
  );
  assert.match(css, /\.operations-panel\s*{[\s\S]*?grid-column: span 2;/);
  assert.match(
    css,
    /#dashboard\[data-mode='public'\] \.operations-panel,\s*#dashboard\[data-mode='viewer'\] \.operations-panel\s*{[\s\S]*?grid-column: 1 \/ -1;/
  );
  assert.match(css, /\.button\s*{[\s\S]*?white-space: nowrap;/);
  assert.match(css, /body\s*{[\s\S]*?background: #050505;/);
  assert.doesNotMatch(css, /radial-gradient|linear-gradient/);
  assert.match(
    css,
    /@media \(max-width: 900px\)[\s\S]*?\.header\s*{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;/
  );
  assert.match(
    css,
    /@media \(max-width: 900px\)[\s\S]*?\.site-deployment-status\s*{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?grid-row: 2;/
  );
  assert.match(
    css,
    /@media \(max-width: 900px\)[\s\S]*?\.site-deployment-status\s*{[\s\S]*?justify-content: flex-start;/
  );
  assert.match(css, /\.shell\s*{[\s\S]*?min-height: 100dvh;/);
  assert.match(
    css,
    /#dashboard\[data-mode='public'\],\s*#dashboard\[data-mode='viewer'\]\s*{[\s\S]*?flex: 1;/
  );
  assert.match(
    css,
    /#dashboard\[data-mode='public'\] \.workspace-grid,\s*#dashboard\[data-mode='viewer'\] \.workspace-grid\s*{[\s\S]*?flex: 1;/
  );
  assert.match(
    css,
    /#dashboard\[data-mode='public'\] \.operations-panel,\s*#dashboard\[data-mode='viewer'\] \.operations-panel\s*{[\s\S]*?display: flex;[\s\S]*?flex-direction: column;/
  );
  assert.doesNotMatch(css, /\.panel-scroll-area/);
});

test('web app manifest uses the Deploy Hub identity and existing blue icons', async () => {
  const manifest = JSON.parse(await readUiFile('manifest.webmanifest'));

  assert.equal(manifest.name, '6529 Deploy Hub');
  assert.equal(manifest.short_name, '6529 Deploy Hub');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(
    manifest.icons.map(({ sizes, src }) => [sizes, src]),
    [
      ['192x192', './assets/brand/deploy-hub-icon-192.png'],
      ['512x512', './assets/brand/deploy-hub-icon-512.png']
    ]
  );
});

test('PR picker searches open work and keeps the bounded multi-select contract', async () => {
  const [app, css, html] = await Promise.all([
    readUiFile('app.js'),
    readUiFile('styles.css'),
    readUiFile('index.html')
  ]);

  assert.match(html, /id="pr-search"/);
  assert.match(html, /Search PR, branch, title, or author/);
  assert.match(html, /Selection order is deployment order/);
  assert.match(app, /listOpenPullRequests/);
  assert.match(app, /MAX_SELECTED_PULL_REQUESTS = 20/);
  assert.match(
    css,
    /\.pr-options\s*{[\s\S]*?overflow-x: hidden;[\s\S]*?overflow-y: auto;/
  );
  assert.match(css, /\.pr-option strong\s*{[\s\S]*?-webkit-line-clamp: 2;/);
  assert.match(css, /\.pr-option span\s*{[\s\S]*?overflow-wrap: anywhere;/);
});

test('declared icons exist at their exact expected dimensions', async () => {
  const expected = new Map([
    ['assets/brand/favicon-16.png', [16, 16]],
    ['assets/brand/favicon-32.png', [32, 32]],
    ['assets/brand/favicon-48.png', [48, 48]],
    ['assets/brand/apple-touch-icon-180.png', [180, 180]],
    ['assets/brand/deploy-hub-icon-192.png', [192, 192]]
  ]);

  for (const [path, dimensions] of expected) {
    const png = await readFile(new URL(path, UI_ROOT));
    assert.deepEqual(
      [...png.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10]
    );
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], dimensions);
  }
});
