import pRetry, { Options, FailedAttemptError } from "p-retry";
/**
 * Wrap ANY promise-returning fn in automatic retries.
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  opts: Options = {
    retries: 2,
    factor: 2,
    minTimeout: 100,
    maxTimeout: 1000,
    onFailedAttempt: (error: FailedAttemptError) => {
      console.warn(
        `[retry] attempt #${error.attemptNumber} failed; ` +
          `${error.retriesLeft} retries left; ${error.message}`
      );
    },
  }
): Promise<T> {
  return pRetry(fn, opts);
}
