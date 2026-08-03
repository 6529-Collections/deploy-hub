export interface GitHubGateway {
  readonly kind: 'disabled';
  readonly canRead: false;
  readonly canWrite: false;
}

export const disabledGitHubGateway: GitHubGateway = Object.freeze({
  kind: 'disabled',
  canRead: false,
  canWrite: false
});
