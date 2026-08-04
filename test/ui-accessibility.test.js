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
    this.dataset = {};
    this.disabled = false;
    this.focused = false;
    this.hidden = false;
    this.listeners = new Map();
    this.textContent = '';
    this.value = '';
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  focus() {
    this.focused = true;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
}

test('browser entry module initializes the signed-out UI without a server', async () => {
  const elements = new Map();
  const documentDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'document'
  );
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage'
  );

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      querySelector(selector) {
        if (selector === 'meta[name="deploy-hub-commit"]') {
          const meta = new UiElement();
          meta.setAttribute('content', 'test-sha');
          return meta;
        }
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

  try {
    await import(new URL(`app.js?test=${Date.now()}`, UI_ROOT));

    assert.equal(elements.get('#auth-state').textContent, 'Not connected');
    assert.equal(elements.get('#auth-panel').hidden, false);
    assert.equal(elements.get('#dashboard').hidden, true);
    assert.equal(elements.get('#forget-github').hidden, true);
    assert.equal(elements.get('#github-token').focused, true);
    assert.equal(elements.get('#source-sha').textContent, 'test-sha');
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
  const html = await readUiFile('index.html');

  assert.match(html, /<html lang="en">/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /for="github-token"/);
  assert.match(
    html,
    /id="github-token"[\s\S]*aria-describedby="github-token-help"/
  );
  assert.match(html, /for="pr-numbers"/);
  assert.match(
    html,
    /id="pr-numbers"[\s\S]*aria-describedby="pr-numbers-help"/
  );
  assert.match(html, /<fieldset>[\s\S]*<legend>Final target<\/legend>/);
  assert.match(html, /id="auth-message" role="status"/);
  assert.match(html, /id="operation-message" role="status"/);
  assert.match(html, /id="operations-panel"[\s\S]*aria-busy="false"/);
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
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)="https?:/i);
});

test('keyboard focus, reduced motion, and readable muted copy stay enforced', async () => {
  const css = await readUiFile('styles.css');

  assert.match(css, /:focus-visible/);
  assert.match(css, /\.target-option:focus-within/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.field-hint\s*{[\s\S]*?color: #94a3b8;/);
  assert.match(css, /footer\s*{[\s\S]*?color: #94a3b8;/);
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
