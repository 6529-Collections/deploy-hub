export interface GitLedgerHead {
  readonly sha: string | null;
  readonly files: ReadonlyMap<string, string>;
}

export interface GitLedgerRepository {
  readHead(): GitLedgerHead;

  compareAndSwap(
    expectedHeadSha: string | null,
    files: ReadonlyMap<string, string>,
    message: string
  ): string | undefined;
}
