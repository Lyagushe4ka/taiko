export const MANTA_WETH_ADDRESS = '0x0dc808adce2099a9f62aa87d9670745aba741746';

export interface Token {
  address: string;
  decimals: number;
  ticker: Tickers;
}

export type Tickers = 'USDC' | 'USDT' | 'MANTA' | 'WETH' | 'USDZ' | 'MUSD';
export type Dexes = 'gull' | 'openocean';

export const MANTA_TOKENS: Record<Tickers, Token> = {
  USDC: {
    address: '0xb73603c5d87fa094b7314c74ace2e64d165016fb',
    decimals: 6,
    ticker: 'USDC',
  },
  USDT: {
    address: '0xf417f5a458ec102b90352f697d6e2ac3a3d2851f',
    decimals: 6,
    ticker: 'USDT',
  },
  MANTA: {
    address: '0x95CeF13441Be50d20cA4558CC0a27B601aC544E5',
    decimals: 18,
    ticker: 'MANTA',
  },
  WETH: {
    address: MANTA_WETH_ADDRESS,
    decimals: 18,
    ticker: 'WETH',
  },
  USDZ: {
    address: '0x73d23F3778a90Be8846E172354A115543dF2a7E4',
    decimals: 18,
    ticker: 'USDZ',
  },
  MUSD: {
    address: '0x649d4524897cE85A864DC2a2D5A11Adb3044f44a',
    decimals: 18,
    ticker: 'MUSD',
  },
};

export const ROUTES: Record<Tickers, Record<Dexes, Tickers[]>> = {
  USDC: {
    gull: ['USDT', 'MANTA'],
    openocean: ['USDT', 'MANTA', 'WETH'],
  },
  USDT: {
    gull: ['MUSD', 'USDC', 'USDZ'],
    openocean: ['MANTA', 'USDC', 'WETH', 'MUSD'],
  },
  MANTA: {
    gull: ['USDC', 'WETH'],
    openocean: ['USDC', 'USDT', 'WETH'],
  },
  WETH: {
    gull: ['MANTA'],
    openocean: ['MANTA', 'USDC', 'USDT'],
  },
  USDZ: {
    gull: ['USDT'],
    openocean: [],
  },
  MUSD: {
    gull: ['USDT'],
    openocean: ['USDT'],
  },
};
