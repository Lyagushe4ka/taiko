import { Contract, ContractTransaction, JsonRpcProvider, TransactionReceipt, Wallet } from 'ethers';
import { LIMITS } from '../deps/config';
import { TimeSeparated } from './types';
import axios from 'axios';
import { ABI } from './constants';

let rates: Record<string, number> = {};
let ratesLastUpdated = 0;

export const timeout = async () => {
  const timeoutMin = convertTimeToSeconds(LIMITS.timeoutMin);
  const timeoutMax = convertTimeToSeconds(LIMITS.timeoutMax);
  const rndTimeout = randomBetween(timeoutMin, timeoutMax, 0);

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

export const sleep = async (
  from: TimeSeparated,
  to?: TimeSeparated,
  logger = true,
): Promise<void> => {
  const seconds = from.seconds || 0;
  const minutes = from.minutes || 0;
  const hours = from.hours || 0;
  const msFrom = seconds * 1000 + minutes * 60 * 1000 + hours * 60 * 60 * 1000;

  let timeoutMilliseconds = msFrom;
  if (to) {
    const seconds = to.seconds || 0;
    const minutes = to.minutes || 0;
    const hours = to.hours || 0;
    const msTo = seconds * 1000 + minutes * 60 * 1000 + hours * 60 * 60 * 1000;
    const ms = Math.floor(Math.random() * (msTo - msFrom + 1) + msFrom);
    timeoutMilliseconds = ms;
  }

  const timeoutMinutes = Math.floor(timeoutMilliseconds / 1000 / 60);
  const timeoutSeconds = Math.floor((timeoutMilliseconds / 1000) % 60);

  if (logger) {
    console.log(
      `\nSleeping for ${Math.floor(
        timeoutMilliseconds / 1000,
      )} seconds | ${timeoutMinutes} minutes and ${timeoutSeconds} seconds\n`,
    );
  }
  return new Promise((resolve) => setTimeout(resolve, timeoutMilliseconds));
};

export const randomBetween = (min: number, max: number, roundTo?: number): number => {
  const random = Math.random() * (max - min) + min;
  return roundTo !== undefined ? Math.round(random * 10 ** roundTo) / 10 ** roundTo : random;
};

export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 5,
  timeoutInSec = 8,
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
        console.log('\n' + text + '\n');
        if (logger) {
          await logger(text, true);
        }
      } else if (typeof e === 'string') {
        const text = `[RETRY] Error while executing function. Message: ${e}. Attempts left: ${
          attempts === Number.MAX_SAFE_INTEGER ? 'infinity' : attempts
        }`;
        console.log('\n' + text + '\n');
        if (logger) {
          await logger(text, true);
        }
      } else {
        const text = `[RETRY] An unexpected error occurred. Attempts left: ${
          attempts === Number.MAX_SAFE_INTEGER ? 'infinity' : attempts
        }`;
        console.log('\n' + text + '\n');
        if (logger) {
          await logger(text, true);
        }
      }
      if (attempts === 0) {
        return Promise.reject(e);
      }
      await sleep({ seconds: timeoutInSec }, undefined, false);
    }
  }
  return response!;
}

export async function execTx(
  rpcs: string[],
  txData: ContractTransaction,
  pk: string,
  type: 'legacy' | 'eip1559' = 'legacy',
): Promise<TransactionReceipt | null> {
  const providers = rpcs.map((rpc) => new JsonRpcProvider(rpc));
  const signers = providers.map((provider) => new Wallet(pk, provider));

  const nonce = await retry(() => Promise.any(signers.map((signer) => signer.getNonce())));
  const feeData = await retry(() =>
    Promise.any(providers.map((provider) => provider.getFeeData())),
  );

  if (type === 'eip1559') {
    txData.maxFeePerGas = (feeData.maxFeePerGas! * 150n) / 100n;
    txData.maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas! * 120n) / 100n;
  } else {
    txData.gasPrice = (feeData.gasPrice! * 150n) / 100n;
  }

  txData.nonce = nonce;

  const tx = await retry(() =>
    Promise.race([
      Promise.any(signers.map((signer) => signer.sendTransaction(txData))),
      sleep({ seconds: LIMITS.receiptWaitTimeout }, undefined, false).then(() =>
        Promise.reject('timeout waiting for tx to be sent'),
      ),
    ]),
  );

  console.log(`Sent tx: ${tx.hash}, waiting for receipt...`);

  const receipt = await retry(() =>
    Promise.race([
      Promise.any(providers.map((provider) => provider.getTransactionReceipt(tx.hash))).then((r) =>
        r === null ? Promise.reject('Got null from rpc, trying again...') : r,
      ),
      sleep({ seconds: LIMITS.receiptWaitTimeout }, undefined, false).then(() =>
        Promise.reject('timeout waiting for tx to be sent'),
      ),
    ]),
  );

  return receipt;
}

export async function getRate(tickers: string[]): Promise<number[] | null> {
  if (Object.keys(rates).length === 0 || Date.now() - ratesLastUpdated > 1000 * 60 * 60) {
    rates = await getBinanceRatesToUSD();
    ratesLastUpdated = Date.now();
  }

  let ratesArr: Array<number> = [];
  for (const ticker of tickers) {
    let cur = ticker.toUpperCase();
    if (['USDT', 'USDC', 'DAI', 'XDAI', 'BUSD', 'USDZ', 'MUSD'].includes(cur)) {
      ratesArr.push(1);
      continue;
    }
    if (cur === 'WETH') {
      cur = 'ETH';
    }
    if (cur === 'BTCB' || cur === 'WBTC') {
      cur = 'BTC';
    }
    const currentRate = rates[cur] ?? null;
    if (!currentRate) {
      return null;
    }
    ratesArr.push(currentRate);
  }

  return ratesArr;
}

export const getBinanceRatesToUSD = async (): Promise<Record<string, number>> => {
  const endpoint = 'https://api.binance.com/api/v3/ticker/price';
  const { data } = await retry(() => axios.get(endpoint));
  const prices: Record<string, number> = {};
  for (const { symbol, price } of data) {
    if (symbol.endsWith('USDT') || symbol.endsWith('USDC')) {
      prices[symbol.substring(0, symbol.length - 4)] = parseFloat(price);
    }
  }
  return prices;
};

export const makeApproveTx = async (
  wallet: Wallet,
  tokenAddress: string,
  spender: string,
  amount: bigint,
  rpc: string[],
) => {
  const contract = new Contract(tokenAddress, ABI);

  const txData = await retry(() => contract.approve.populateTransaction(spender, amount));

  const receipt = await execTx(rpc, txData, wallet.privateKey);

  if (!receipt || receipt.status === 0) {
    return null;
  }

  if (amount === 0n) {
    console.log('Revoked on wallet: ', wallet.address);
  }

  return receipt.hash;
};
