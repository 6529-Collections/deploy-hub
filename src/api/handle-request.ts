import { runtimeStatus } from '../domain/runtime-status.js';

export interface ApiResponse {
  readonly body: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly statusCode: number;
}

const JSON_HEADERS = Object.freeze({
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8'
});

export function handleApiRequest(
  method: string,
  pathname: string
): ApiResponse {
  if (
    method === 'GET' &&
    (pathname === '/healthz' || pathname === '/api/v1/status')
  ) {
    return jsonResponse(200, runtimeStatus);
  }

  return jsonResponse(404, {
    error: 'not_found',
    message: 'No Deploy Hub operation is implemented at this path.'
  });
}

function jsonResponse(statusCode: number, body: unknown): ApiResponse {
  return {
    body: JSON.stringify(body),
    headers: JSON_HEADERS,
    statusCode
  };
}
