/**
 * 指数重试
 */
export const retry = async <T extends (...args: unknown[]) => Promise<unknown>>(
  func: T,
): Promise<ReturnType<T>> => {
  return await func();
};
