import { createHash } from 'node:crypto';

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Canonical JSON rejects non-finite numbers.');
    }
    return JSON.stringify(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key]!)}`);
  return `{${entries.join(',')}}`;
}

export function jsonDigest(value: JsonValue): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function parseJsonObject(serialized: string): JsonObject {
  const value = JSON.parse(serialized) as unknown;
  if (!isJsonObject(value)) {
    throw new Error('Expected a JSON object.');
  }
  return value;
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function cloneJson<T extends JsonValue>(value: T): T {
  return JSON.parse(canonicalJson(value)) as T;
}
