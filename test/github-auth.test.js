import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

import {
  GitHubAuthError,
  TOKEN_STORAGE_KEY,
  authenticateGitHubToken,
  forgetToken,
  loadStoredToken,
  storeToken
} from '../ui/github-auth.js';

const TOKEN = 'token-canary-never-expose';

function jsonResponse(status, payload) {
  return {
    json: async () => payload,
    ok: status >= 200 && status < 300,
    status
  };
}

function sequenceFetch(responses, requests) {
  return async (url, options) => {
    requests.push({ url, options });
    const response = responses.shift();
    assert.ok(response, `Unexpected request to ${url}`);
    return response;
  };
}

test('requires a token before calling GitHub', async () => {
  let called = false;

  await assert.rejects(
    authenticateGitHubToken('  ', async () => {
      called = true;
      return jsonResponse(500, {});
    }),
    (error) =>
      error instanceof GitHubAuthError && error.code === 'missing_token'
  );
  assert.equal(called, false);
});

test('authenticates an active deployment-operator team member', async () => {
  const requests = [];
  const fetchImpl = sequenceFetch(
    [
      jsonResponse(200, { login: 'prxt6529' }),
      jsonResponse(200, { role: 'member', state: 'active' }),
      jsonResponse(200, { state: 'active' })
    ],
    requests
  );

  const identity = await authenticateGitHubToken(TOKEN, fetchImpl);

  assert.deepEqual(identity, { login: 'prxt6529' });
  assert.equal(JSON.stringify(identity).includes(TOKEN), false);
  assert.equal(requests.length, 3);
  for (const request of requests) {
    assert.equal(request.url.includes(TOKEN), false);
    assert.equal(request.options.headers.authorization, `Bearer ${TOKEN}`);
  }
});

test('authenticates an active organization admin without a team lookup', async () => {
  const requests = [];
  const fetchImpl = sequenceFetch(
    [
      jsonResponse(200, { login: 'admin-user' }),
      jsonResponse(200, { role: 'admin', state: 'active' })
    ],
    requests
  );

  assert.deepEqual(await authenticateGitHubToken(TOKEN, fetchImpl), {
    login: 'admin-user'
  });
  assert.equal(requests.length, 2);
});

test('rejects invalid tokens without exposing GitHub response text', async () => {
  const fetchImpl = sequenceFetch([jsonResponse(401, { message: TOKEN })], []);

  await assert.rejects(
    authenticateGitHubToken(TOKEN, fetchImpl),
    (error) =>
      error instanceof GitHubAuthError &&
      error.code === 'invalid_token' &&
      !error.message.includes(TOKEN)
  );
});

test('rejects users outside the operator team', async () => {
  const fetchImpl = sequenceFetch(
    [
      jsonResponse(200, { login: 'ordinary-user' }),
      jsonResponse(200, { role: 'member', state: 'active' }),
      jsonResponse(404, { message: 'Not Found' })
    ],
    []
  );

  await assert.rejects(
    authenticateGitHubToken(TOKEN, fetchImpl),
    (error) => error instanceof GitHubAuthError && error.code === 'not_operator'
  );
});

test('rejects a token that cannot verify operator membership', async () => {
  const fetchImpl = sequenceFetch(
    [
      jsonResponse(200, { login: 'limited-user' }),
      jsonResponse(403, { message: TOKEN }),
      jsonResponse(403, { message: TOKEN })
    ],
    []
  );

  await assert.rejects(
    authenticateGitHubToken(TOKEN, fetchImpl),
    (error) =>
      error instanceof GitHubAuthError &&
      error.code === 'insufficient_scope' &&
      !error.message.includes(TOKEN)
  );
});

test('stores and forgets the token only through the supplied browser storage', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };

  storeToken(storage, ` ${TOKEN} `);
  assert.equal(values.get(TOKEN_STORAGE_KEY), TOKEN);
  assert.equal(loadStoredToken(storage), TOKEN);

  forgetToken(storage);
  assert.equal(loadStoredToken(storage), '');
});

test('static shell restricts connections and loads no third-party script', async () => {
  const html = await readFile(
    new URL('../ui/index.html', import.meta.url),
    'utf8'
  );

  assert.match(html, /connect-src https:\/\/api\.github\.com/);
  assert.match(html, /deploy-hub-icon-192\.png/);
  assert.match(html, /favicon-32\.png/);
  assert.match(html, /id="forget-github"/);
  assert.match(html, /id="session-panel"[^>]*>[\s\S]*Checking GitHub session/);
  assert.match(html, /id="auth-panel"[\s\S]*?hidden/);
  assert.doesNotMatch(html, /<script[^>]+src="https?:/i);
});

test('dashboard refreshes from GitHub every five seconds', async () => {
  const app = await readFile(new URL('../ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /REFRESH_INTERVAL_MS = 5_000/);
  assert.match(app, /readDashboard\(activeToken\)/);
});
