const GITHUB_API = 'https://api.github.com';
const GITHUB_ORGANIZATION = '6529-Collections';
const GITHUB_OPERATOR_TEAM = 'release-bus-operators';

export const TOKEN_STORAGE_KEY = 'deploy-hub.github-token';

export class GitHubAuthError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'GitHubAuthError';
    this.code = code;
  }
}

async function githubRequest(path, token, fetchImpl) {
  return fetchImpl(`${GITHUB_API}${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28'
    }
  });
}

function validLogin(payload) {
  return typeof payload?.login === 'string' && payload.login.length > 0;
}

export async function authenticateGitHubToken(
  suppliedToken,
  fetchImpl = globalThis.fetch
) {
  const token = suppliedToken.trim();
  if (!token) {
    throw new GitHubAuthError('missing_token', 'Enter a GitHub token.');
  }

  const viewerResponse = await githubRequest('/user', token, fetchImpl);
  if (viewerResponse.status === 401 || viewerResponse.status === 403) {
    throw new GitHubAuthError('invalid_token', 'GitHub rejected this token.');
  }
  if (!viewerResponse.ok) {
    throw new GitHubAuthError(
      'github_unavailable',
      'Could not reach GitHub. Try again.'
    );
  }

  const viewer = await viewerResponse.json();
  if (!validLogin(viewer)) {
    throw new GitHubAuthError(
      'invalid_response',
      'GitHub returned an invalid identity response.'
    );
  }

  const login = viewer.login;
  const encodedLogin = encodeURIComponent(login);
  const membershipResponse = await githubRequest(
    `/orgs/${GITHUB_ORGANIZATION}/memberships/${encodedLogin}`,
    token,
    fetchImpl
  );

  if (membershipResponse.ok) {
    const membership = await membershipResponse.json();
    if (membership.state === 'active' && membership.role === 'admin') {
      return { login };
    }
  }

  const teamResponse = await githubRequest(
    `/orgs/${GITHUB_ORGANIZATION}/teams/${GITHUB_OPERATOR_TEAM}/memberships/${encodedLogin}`,
    token,
    fetchImpl
  );

  if (teamResponse.ok) {
    const teamMembership = await teamResponse.json();
    if (teamMembership.state === 'active') {
      return { login };
    }
  }

  if (teamResponse.status === 401 || teamResponse.status === 403) {
    throw new GitHubAuthError(
      'insufficient_scope',
      'This token cannot verify deployment-operator access.'
    );
  }

  throw new GitHubAuthError(
    'not_operator',
    'This GitHub user is not a deployment operator.'
  );
}

export function loadStoredToken(storage) {
  return storage.getItem(TOKEN_STORAGE_KEY) ?? '';
}

export function storeToken(storage, token) {
  storage.setItem(TOKEN_STORAGE_KEY, token.trim());
}

export function forgetToken(storage) {
  storage.removeItem(TOKEN_STORAGE_KEY);
}
