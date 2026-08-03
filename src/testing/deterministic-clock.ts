export class DeterministicClock {
  private milliseconds: number;

  public constructor(initialTime = '2026-08-03T00:00:00.000Z') {
    const milliseconds = Date.parse(initialTime);
    if (!Number.isFinite(milliseconds)) {
      throw new Error('The deterministic clock requires a valid timestamp.');
    }

    this.milliseconds = milliseconds;
  }

  public now(): string {
    return new Date(this.milliseconds).toISOString();
  }

  public advance(milliseconds: number): string {
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) {
      throw new Error('Clock advancement must be a non-negative integer.');
    }

    this.milliseconds += milliseconds;
    return this.now();
  }
}

export class DeterministicEventIds {
  private nextValue = 1;

  public next(): string {
    const suffix = String(this.nextValue).padStart(12, '0');
    this.nextValue += 1;
    return `00000000-0000-4000-8000-${suffix}`;
  }
}
