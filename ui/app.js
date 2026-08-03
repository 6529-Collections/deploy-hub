import {
  GitHubAuthError,
  authenticateGitHubToken,
  forgetToken,
  loadStoredToken,
  storeToken
} from './github-auth.js';

const sourceSha = document.querySelector('#source-sha');
const commit = document
  .querySelector('meta[name="deploy-hub-commit"]')
  ?.getAttribute('content');
const authForm = document.querySelector('#auth-form');
const tokenInput = document.querySelector('#github-token');
const connectButton = document.querySelector('#connect-github');
const forgetButton = document.querySelector('#forget-github');
const authMessage = document.querySelector('#auth-message');
const authBadge = document.querySelector('#auth-state');

if (sourceSha && commit) {
  sourceSha.textContent = commit;
}

function showSignedOut(message = 'Connect GitHub to continue.') {
  authBadge.textContent = 'Not connected';
  authMessage.textContent = message;
  forgetButton.hidden = true;
  connectButton.disabled = false;
}

function showSignedIn(login) {
  authBadge.textContent = 'Connected';
  authMessage.textContent = `Connected as @${login}`;
  forgetButton.hidden = false;
  connectButton.disabled = false;
  tokenInput.value = '';
}

async function connect(token) {
  connectButton.disabled = true;
  authBadge.textContent = 'Checking';
  authMessage.textContent = 'Verifying with GitHub…';

  try {
    const identity = await authenticateGitHubToken(token);
    storeToken(localStorage, token);
    showSignedIn(identity.login);
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
      error instanceof GitHubAuthError
        ? error.message
        : 'GitHub authentication is temporarily unavailable.'
    );
  }
}

authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void connect(tokenInput.value);
});

forgetButton.addEventListener('click', () => {
  forgetToken(localStorage);
  showSignedOut('GitHub token forgotten.');
});

const storedToken = loadStoredToken(localStorage);
if (storedToken) {
  void connect(storedToken);
} else {
  showSignedOut();
}
