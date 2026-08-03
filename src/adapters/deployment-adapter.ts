export interface DeploymentAdapter {
  readonly kind: 'disabled';
  dispatch(): Promise<never>;
}

export class DisabledDeploymentAdapter implements DeploymentAdapter {
  public readonly kind = 'disabled' as const;

  public async dispatch(): Promise<never> {
    throw new Error('Deployment capability is not implemented.');
  }
}
