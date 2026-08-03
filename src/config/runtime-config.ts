export interface RuntimeConfig {
  readonly host: '127.0.0.1';
  readonly mode: 'offline';
  readonly port: number;
}

const DEFAULT_PORT = 8787;

export function loadRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env
): RuntimeConfig {
  const mode = environment.DEPLOY_HUB_MODE ?? 'offline';
  const host = environment.DEPLOY_HUB_HOST ?? '127.0.0.1';

  if (mode !== 'offline') {
    throw new Error('Only credentialless offline mode is available.');
  }

  if (host !== '127.0.0.1') {
    throw new Error('The Task 4 server must bind to 127.0.0.1.');
  }

  return {
    host,
    mode,
    port: parsePort(environment.DEPLOY_HUB_PORT)
  };
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('DEPLOY_HUB_PORT must be an integer from 1 to 65535.');
  }

  return port;
}
