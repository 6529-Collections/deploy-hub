const runtimeState = document.querySelector('#runtime-state');
const sourceSha = document.querySelector('#source-sha');
const commit = document
  .querySelector('meta[name="deploy-hub-commit"]')
  ?.getAttribute('content');

if (sourceSha && commit) {
  sourceSha.textContent = commit;
}

try {
  const response = await fetch('/api/v1/status', {
    headers: { accept: 'application/json' }
  });
  const status = await response.json();

  if (runtimeState) {
    runtimeState.textContent =
      status.mode === 'offline' ? 'Offline' : 'Unknown';
  }
} catch {
  if (runtimeState) {
    runtimeState.textContent = 'API unavailable';
  }
}
