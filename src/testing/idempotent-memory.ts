import { isDeepStrictEqual } from 'node:util';

export class IdempotencyConflictError extends Error {
  public constructor(identity: string) {
    super(`IDEMPOTENCY_CONFLICT: ${identity}`);
    this.name = 'IdempotencyConflictError';
  }
}

export class IdempotentMemory<Input, Result> {
  private readonly entries = new Map<
    string,
    { readonly input: Input; readonly result: Result }
  >();

  public apply(
    identity: string,
    input: Input,
    create: () => Result
  ): { readonly duplicate: boolean; readonly result: Result } {
    const existing = this.entries.get(identity);
    if (existing !== undefined) {
      if (!isDeepStrictEqual(existing.input, input)) {
        throw new IdempotencyConflictError(identity);
      }

      return { duplicate: true, result: existing.result };
    }

    const result = create();
    this.entries.set(identity, { input: structuredClone(input), result });
    return { duplicate: false, result };
  }

  public get size(): number {
    return this.entries.size;
  }
}
