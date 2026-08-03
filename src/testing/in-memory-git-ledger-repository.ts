import { createHash } from 'node:crypto';

import type {
  GitLedgerHead,
  GitLedgerRepository
} from '../ledger/git-ledger-repository.js';

export interface InMemoryGitCommit {
  readonly sha: string;
  readonly parentSha: string | null;
  readonly message: string;
  readonly files: ReadonlyMap<string, string>;
}

export class InMemoryGitLedgerRepository implements GitLedgerRepository {
  private commits: InMemoryGitCommit[] = [];
  private conflictsToInject = 0;
  private files = new Map<string, string>();
  private headSha: string | null = null;

  public readonly metrics = {
    reads: 0,
    compareAndSwaps: 0,
    conflicts: 0
  };

  public readHead(): GitLedgerHead {
    this.metrics.reads += 1;
    return {
      sha: this.headSha,
      files: new Map(this.files)
    };
  }

  public compareAndSwap(
    expectedHeadSha: string | null,
    files: ReadonlyMap<string, string>,
    message: string
  ): string | undefined {
    this.metrics.compareAndSwaps += 1;

    if (this.conflictsToInject > 0) {
      this.conflictsToInject -= 1;
      this.commit(this.files, 'simulated concurrent ledger writer');
      this.metrics.conflicts += 1;
      return undefined;
    }

    if (expectedHeadSha !== this.headSha) {
      this.metrics.conflicts += 1;
      return undefined;
    }

    return this.commit(files, message);
  }

  public injectConflicts(count = 1): void {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error('Conflict count must be a non-negative integer.');
    }
    this.conflictsToInject += count;
  }

  public history(): readonly InMemoryGitCommit[] {
    return this.commits.map((commit) => ({
      ...commit,
      files: new Map(commit.files)
    }));
  }

  public get headBytes(): number {
    return [...this.files.entries()].reduce(
      (total, [path, contents]) =>
        total + Buffer.byteLength(path) + Buffer.byteLength(contents),
      0
    );
  }

  private commit(files: ReadonlyMap<string, string>, message: string): string {
    const nextFiles = new Map(files);
    const serializedFiles = [...nextFiles.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([path, contents]) => `${path}\0${contents}`)
      .join('\0');
    const sha = createHash('sha1')
      .update(
        `${this.commits.length + 1}\0${this.headSha ?? ''}\0${message}\0${serializedFiles}`
      )
      .digest('hex');
    const commit: InMemoryGitCommit = {
      sha,
      parentSha: this.headSha,
      message,
      files: nextFiles
    };

    this.files = nextFiles;
    this.headSha = sha;
    this.commits = [...this.commits, commit];
    return sha;
  }
}
