import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

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
    assert.equal(elements.get('#waiting-state').hidden, true);
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
      app.siteDeploymentPresentation({ id: 123, status: 'in_progress' }),
      {
        action: 'View deployment',
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
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<h1>6529 Deploy Hub<\/h1>/);
  assert.match(
    html,
    /id="site-deployment-status"[\s\S]*?aria-live="polite"[\s\S]*?hidden/
  );
  assert.doesNotMatch(html, /6529 engineering/i);
  assert.match(html, /for="github-token"/);
  assert.match(html, /<h2 id="auth-title">Connect GitHub<\/h2>/);
  assert.match(html, /<dialog[^>]+id="auth-dialog"/);
  assert.match(html, /id="login-github"[\s\S]*?>[\s\S]*?Login/);
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
  assert.match(html, /id="operations-list"[\s\S]*role="list"/);
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
  assert.match(css, /\.summary-workflow-link\s*{[\s\S]*?margin-left: auto;/);
  assert.match(css, /\.summary-value\[href\]:hover/);
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
    /#dashboard\[data-mode='public'\] \.operations-panel\s*{[\s\S]*?grid-column: 1 \/ -1;/
  );
  assert.match(css, /\.button\s*{[\s\S]*?white-space: nowrap;/);
  assert.match(css, /body\s*{[\s\S]*?background: #050505;/);
  assert.doesNotMatch(css, /radial-gradient|linear-gradient/);
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
