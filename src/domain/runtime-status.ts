export const runtimeStatus = {
  schemaVersion: 1,
  service: 'deploy-hub',
  phase: 'credentialless-skeleton',
  mode: 'offline',
  capabilities: {
    githubRead: false,
    githubWrite: false,
    workflowDispatch: false,
    environmentMutation: false,
    awsAccess: false
  }
} as const;

export type RuntimeStatus = typeof runtimeStatus;
