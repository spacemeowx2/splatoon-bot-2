export class RetryError extends Error {
  constructor(public errors: unknown, message: string) {
    super(message);
  }
}

/**
 * 指数重试
 */
export const retry = async <T extends (...args: unknown[]) => Promise<unknown>>(
  func: T,
  { initialDelay = 1000, retryTimes = Infinity, maxDelay = 60 * 1000 }: {
    initialDelay?: number;
    retryTimes?: number;
    maxDelay?: number;
  } = {},
): Promise<ReturnType<T>> => {
  let did = 0;
  let delay = initialDelay;
  const errors: unknown[] = [];
  while (1) {
    try {
      return await func();
    } catch (e) {
      errors.push(e);
      did += 1;
      if (did >= retryTimes) {
        throw new RetryError(errors, `Retry failed for ${did} times.`);
      }
      await sleep(delay);
      delay = Math.min(delay * 2, maxDelay);
    }
  }
};

export const sleep = (ms: number) =>
  new Promise<void>((res) => setTimeout(res, ms));
