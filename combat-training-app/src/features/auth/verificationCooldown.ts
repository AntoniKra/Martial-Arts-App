export function verificationRetrySeconds(sentAt: number | null, now: number): number {
  return sentAt === null ? 0 : Math.min(60, Math.max(0, Math.ceil((sentAt + 60_000 - now) / 1000)))
}
