/**
 * Tracks the newest request generation so out-of-order async responses can be
 * discarded. Paired with AbortController in the caller to cancel in-flight work.
 */
export interface GenerationGuard {
  next(): number;
  isLatest(id: number): boolean;
}

export function createGenerationGuard(): GenerationGuard {
  let current = 0;
  return {
    next() {
      current += 1;
      return current;
    },
    isLatest(id: number) {
      return id === current;
    },
  };
}
