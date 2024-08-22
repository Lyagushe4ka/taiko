import { LIMITS } from '../deps/config';
import { TimeSeparated } from './types';

export const timeout = async () => {
  const timeoutMin = convertTimeToSeconds(LIMITS.timeoutMin);
  const timeoutMax = convertTimeToSeconds(LIMITS.timeoutMax);
  const rndTimeout = randomBetween(timeoutMin, timeoutMax, 0);

  console.log(`\nSleeping for ${rndTimeout} seconds / ${(rndTimeout / 60).toFixed(1)} minutes\n`);
  await sleep({ seconds: rndTimeout });
};

export const shuffleArray = <T>(array: T[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const rndArrElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const convertTimeToSeconds = (time: TimeSeparated): number => {
  const seconds = time.seconds || 0;
  const minutes = time.minutes || 0;
  const hours = time.hours || 0;
  return seconds + minutes * 60 + hours * 60 * 60;
};

export const sleep = async (from: TimeSeparated, to?: TimeSeparated): Promise<void> => {
  const seconds = from.seconds || 0;
  const minutes = from.minutes || 0;
  const hours = from.hours || 0;
  const msFrom = seconds * 1000 + minutes * 60 * 1000 + hours * 60 * 60 * 1000;
  if (to) {
    const seconds = to.seconds || 0;
    const minutes = to.minutes || 0;
    const hours = to.hours || 0;
    const msTo = seconds * 1000 + minutes * 60 * 1000 + hours * 60 * 60 * 1000;
    const ms = Math.floor(Math.random() * (msTo - msFrom + 1) + msFrom);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  return new Promise((resolve) => setTimeout(resolve, msFrom));
};

export const randomBetween = (min: number, max: number, roundTo?: number): number => {
  const random = Math.random() * (max - min) + min;
  return roundTo !== undefined ? Math.round(random * 10 ** roundTo) / 10 ** roundTo : random;
};

export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  timeoutInSec = 6,
  logger?: (text: string, isError: boolean) => Promise<any>,
): Promise<T> {
  let response: T;
  while (attempts--) {
    if (attempts === Number.MAX_SAFE_INTEGER - 1) {
      attempts = Number.MAX_SAFE_INTEGER;
    }
    try {
      response = await fn();
      break;
    } catch (e: any) {
      if (e instanceof Error) {
        const text = `[RETRY] Error while executing function. Message: ${
          e.message
        }. Attempts left: ${attempts === Number.MAX_SAFE_INTEGER ? 'infinity' : attempts}`;
        console.log(text);
        if (logger) {
          await logger(text, true);
        }
      } else {
        const text = `[RETRY] An unexpected error occurred. Attempts left: ${
          attempts === Number.MAX_SAFE_INTEGER ? 'infinity' : attempts
        }`;
        console.log(text);
        if (logger) {
          await logger(text, true);
        }
      }
      if (attempts === 0) {
        return Promise.reject(e.message);
      }
      await sleep({ seconds: timeoutInSec });
    }
  }
  return response!;
}
