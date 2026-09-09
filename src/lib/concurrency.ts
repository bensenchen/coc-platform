export class ConcurrentModificationError extends Error {
  readonly code = 'STALE_WRITE';
  constructor(entity: string) {
    super(`${entity} changed on another client. The latest server version has been restored.`);
    this.name = 'ConcurrentModificationError';
  }
}
