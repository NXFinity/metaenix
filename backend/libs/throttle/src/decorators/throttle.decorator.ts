import { SetMetadata } from '@nestjs/common';
import { ThrottleOptions } from '../interfaces/throttle-options.interface';

export const THROTTLE_KEY = 'throttle:options';
export const THROTTLE_SKIP_KEY = 'throttle:skip';

/**
 * Throttle decorator - Apply rate limiting to a route
 * @param options Throttle options (limit and ttl)
 * @example
 * @Throttle({ limit: 10, ttl: 60 }) // 10 requests per 60 seconds
 */
export const Throttle = (options: ThrottleOptions | number, ttl?: number) => {
  let throttleOptions: ThrottleOptions;

  // Support shorthand: @Throttle(10, 60) for 10 requests per 60 seconds
  if (typeof options === 'number') {
    throttleOptions = {
      limit: options,
      ttl: ttl || 60,
    };
  } else {
    throttleOptions = options;
  }

  return SetMetadata(THROTTLE_KEY, throttleOptions);
};

/**
 * Skip throttle decorator - Skip rate limiting for a route
 */
export const SkipThrottle = () => SetMetadata(THROTTLE_SKIP_KEY, true);

