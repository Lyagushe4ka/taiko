import { Contract, formatEther, formatUnits, JsonRpcProvider } from 'ethers';
import { CONFIG_CONSTANTS } from '../../deps/config';
import { MulticallWrapper } from 'ethers-multicall-provider';
import { Dexes, MANTA_TOKENS, ROUTES, Tickers } from './constants';
import { ABI } from '../constants';
import { getRate, rndArrElement } from '../utils';

export interface Balances {
  balancesInWei: Record<string, bigint>;
  balancesInEther: Record<string, string>;
  balancesInUsd: Record<string, string>;
}

export const getBalances = async (address: string): Promise<Balances | null> => {
  const rpcs = CONFIG_CONSTANTS.mantaRpcs;

  const providers = rpcs.map((rpc) => new JsonRpcProvider(rpc));
  const multicallProviders = providers.map((provider) => MulticallWrapper.wrap(provider));

  let tokenBalances: bigint[] | null = null;
  let nativeBal: bigint | null = null;
  for (const provider of multicallProviders) {
    try {
      const contracts = Object.values(MANTA_TOKENS).map(
        (token) => new Contract(token.address, ABI, provider),
      );

      tokenBalances = await Promise.all(contracts.map((contract) => contract.balanceOf(address)));
      nativeBal = await provider.getBalance(address);
      break;
    } catch (e: any) {
      continue;
    }
  }

  if (!tokenBalances || !nativeBal) {
    console.log('Error while getting token balances');
    return null;
  }

  let balancesInWei: Record<string, bigint> = {};
  Object.keys(MANTA_TOKENS).forEach((key, i) => {
    balancesInWei[key] = tokenBalances[i];
  });
  balancesInWei['ETH'] = nativeBal;

  let balancesInEther: Record<string, string> = {};
  Object.keys(MANTA_TOKENS).forEach((key, i) => {
    balancesInEther[key] = formatUnits(tokenBalances[i], MANTA_TOKENS[key as Tickers].decimals);
  });
  balancesInEther['ETH'] = formatEther(nativeBal);

  const rates = await getRate([...Object.keys(MANTA_TOKENS), 'ETH']);

  if (!rates) {
    console.log('Error while getting token rates');
    return null;
  }

  let balancesInUsd: Record<string, string> = {};
  Object.keys(MANTA_TOKENS).forEach((key, i) => {
    balancesInUsd[key] = (parseFloat(balancesInEther[key]) * rates[i]).toFixed(2);
  });

  balancesInUsd['ETH'] = (parseFloat(balancesInEther['ETH']) * rates[rates.length - 1]).toFixed(2);

  return {
    balancesInWei,
    balancesInEther,
    balancesInUsd,
  };
};

export const getRoute = (tokenIn: Tickers): { dex: Dexes; token: Tickers } | null => {
  const ticker = tokenIn;

  const routes = ROUTES[ticker];

  const notZeroRouts = Object.entries(routes).filter(([dex, tokens]) => tokens.length > 0);

  if (notZeroRouts.length === 0) {
    return null;
  }

  if (notZeroRouts.length === 1) {
    const [dex, tokens] = notZeroRouts[0];
    const token = rndArrElement(tokens);

    return {
      dex: dex as Dexes,
      token: token,
    };
  } else {
    const [dex, tokens] = rndArrElement(notZeroRouts);
    const token = rndArrElement(tokens);

    return {
      dex: dex as Dexes,
      token: token,
    };
  }
};
