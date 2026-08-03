const sourceSha = document.querySelector('#source-sha');
const commit = document
  .querySelector('meta[name="deploy-hub-commit"]')
  ?.getAttribute('content');

if (sourceSha && commit) {
  sourceSha.textContent = commit;
}
