/**
 * Bounded external HTTP fetch with a module-level circuit breaker.
 * Release It! (p.106-110): timeouts + breaker prevent cascading failures.
 * Retries only transient 5xx with exponential backoff + full jitter.
 */
interface Breaker { failures: number; openUntil: number; }
const breakers = new Map<string, Breaker>();

export class CircuitOpenError extends Error {
  constructor(source: string) { super(`Circuit open for ${source}`); this.name = "CircuitOpenError"; }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const isClientError = (status: number) => status === 400 || status === 401 || status === 403 || status === 404 || status === 422;

export async function resilientFetchJson<T>(source: string, url: string, timeoutMs = 5000): Promise<T> {
  const breaker = breakers.get(source) || { failures: 0, openUntil: 0 };
  if (breaker.openUntil > Date.now()) throw new CircuitOpenError(source);

  const attempts = 2;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": "nutrition-tracker/1.0 (public nutrition lookup)" },
        cache: "no-store",
      });
    } catch (err) {
      if (attempt < attempts - 1) { await sleep(Math.random() * Math.min(400, 100 * 2 ** attempt)); continue; }
      breakers.set(source, { failures: breaker.failures + 1, openUntil: breaker.failures + 1 >= 5 ? Date.now() + 30_000 : 0 });
      throw err;
    }

    // 4xx is a client error: fast-fail, never retried, never counted as outage.
    if (isClientError(response.status)) throw new Error(`Client error ${response.status}`);

    if (!response.ok) {
      if (attempt < attempts - 1) { await sleep(Math.random() * Math.min(400, 100 * 2 ** attempt)); continue; }
      breakers.set(source, { failures: breaker.failures + 1, openUntil: breaker.failures + 1 >= 5 ? Date.now() + 30_000 : 0 });
      throw new Error(`HTTP ${response.status}`);
    }

    breakers.set(source, { failures: 0, openUntil: 0 });
    return (await response.json()) as T;
  }
  throw new Error(`Failed to fetch ${source}`);
}
