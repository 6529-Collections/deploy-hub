import { DeterministicClock } from './deterministic-clock.js';
import { IdempotentMemory } from './idempotent-memory.js';

export type FakeCommunicationObservation =
  | {
      readonly outcomeEventId: string;
      readonly communicationId: string;
      readonly channel: 'ci_drop';
      readonly state: 'accepted' | 'failed';
    }
  | {
      readonly outcomeEventId: string;
      readonly communicationId: string;
      readonly channel: 'release_note';
      readonly state: 'enqueued' | 'published' | 'skipped' | 'failed';
    };

export interface FakeCommunicationOutcome {
  readonly outcomeEventId: string;
  readonly communicationId: string;
  readonly channel: 'ci_drop' | 'release_note';
  readonly state: 'accepted' | 'enqueued' | 'published' | 'skipped' | 'failed';
  readonly nonGating: true;
  readonly observedAt: string;
}

export class FakeCommunicationSink {
  public readonly capabilities = Object.freeze({
    network: false,
    realPosts: false,
    realReleaseNotes: false
  });

  private readonly deliveries = new IdempotentMemory<
    FakeCommunicationObservation,
    FakeCommunicationOutcome
  >();
  private readonly latestByCommunication = new Map<
    string,
    FakeCommunicationOutcome
  >();

  public constructor(private readonly clock: DeterministicClock) {}

  public observe(input: FakeCommunicationObservation): {
    readonly duplicate: boolean;
    readonly result: FakeCommunicationOutcome;
  } {
    return this.deliveries.apply(input.outcomeEventId, input, () => {
      this.assertProgression(input);
      const outcome: FakeCommunicationOutcome = {
        ...input,
        nonGating: true,
        observedAt: this.clock.now()
      };
      this.latestByCommunication.set(input.communicationId, outcome);
      return outcome;
    });
  }

  public get deliveryCount(): number {
    return this.deliveries.size;
  }

  private assertProgression(input: FakeCommunicationObservation): void {
    const previous = this.latestByCommunication.get(input.communicationId);
    if (previous === undefined) {
      return;
    }

    if (previous.channel !== input.channel) {
      throw new Error('A communication identity cannot change channel.');
    }

    if (
      input.channel !== 'release_note' ||
      previous.state !== 'enqueued' ||
      !['published', 'skipped', 'failed'].includes(input.state)
    ) {
      throw new Error(
        `Invalid communication progression: ${previous.state} -> ${input.state}`
      );
    }
  }
}
