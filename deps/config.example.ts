export const LIMITS = {
  // General
  timeoutMin: {
    seconds: 10, // specify minimum timeout between actions
    minutes: 0,
    hours: 0,
  },
  timeoutMax: {
    seconds: 20, // specify maximum timeout between actions
    minutes: 0,
    hours: 0,
  },

  errorTimeout: 30, // 30 seconds
  receiptWaitTimeout: 40, // 40 seconds

  // Taiko
  wrapTxMin: 5,
  wrapTxMax: 10,

  wrapPercentMin: 10,
  wrapPercentMax: 20,

  approveTxMin: 5,
  approveTxMax: 10,

  // Manta
  slippage: 1.5, // 1.5% slippage

  swapTxMin: 5,
  swapTxMax: 10,

  utilityTxMin: 5,
  utilityTxMax: 10,

  swapPercentMin: 10, // 10%
  swapPercentMax: 20, // 20%

  nativeBalanceMin: 0.01, // 0.01 ETH
};

export const CONFIG_CONSTANTS = {
  // Taiko
  rpc: 'https://rpc.ankr.com/taiko',
  tokensToApprove: [
    '0xc4C410459fbaF8f7F86b6cEE52b4fA1282FF9704', // wbtc
    '0x7d02A3E0180451B17e5D7f29eF78d06F8117106C', // dai
    '0xA9d23408b9bA935c230493c40C73824Df71A0975', // taiko
    '0xA51894664A773981C6C112C43ce576f315d5b1B6', // weth
    '0x19e26B0638bf63aa9fa4d14c6baF8D52eBE86C5C', // usdc stargate
    '0x07d83526730c7438048D55A4fc0b850e2aaB6f0b', // usdc
    '0x9c2dc7377717603eB92b2655c5f2E7997a4945BD', // usdt stargate
  ],
  contractsToApprove: [
    '0xc4C410459fbaF8f7F86b6cEE52b4fA1282FF9704', // wbtc
    '0x7d02A3E0180451B17e5D7f29eF78d06F8117106C', // dai
    '0xA9d23408b9bA935c230493c40C73824Df71A0975', // taiko
    '0xA51894664A773981C6C112C43ce576f315d5b1B6', // weth
    '0x19e26B0638bf63aa9fa4d14c6baF8D52eBE86C5C', // usdc stargate
    '0x07d83526730c7438048D55A4fc0b850e2aaB6f0b', // usdc
    '0x9c2dc7377717603eB92b2655c5f2E7997a4945BD', // usdt stargate
  ],

  // Manta
  mantaRpcs: [
    'https://1rpc.io/manta',
    'https://manta-pacific-gascap.calderachain.xyz/http',
    'https://www.tencentcloud-rpc.com/v2/manta/manta-rpc',
    'https://manta-pacific.drpc.org',
    'https://manta.nirvanalabs.xyz/mantapublic',
    'https://endpoints.omniatech.io/v1/manta-pacific/mainnet/public',
    'https://pacific-rpc.manta.network/http',
    'https://r1.pacific.manta.systems/http',
  ],

  revokeTokens: [
    '0x95CeF13441Be50d20cA4558CC0a27B601aC544E5',
    '0xf417F5A458eC102B90352F697D6e2Ac3A3d2851f',
    '0xb73603C5d87fA094B7314C74ACE2e64D165016fb',
    '0xEc901DA9c68E90798BbBb74c11406A32A70652C3',
    '0x6Fae4D9935E2fcb11fC79a64e917fb2BF14DaFaa',
    '0x0Dc808adcE2099A9F62AA87D9670745AbA741746',
  ],
  revokeContracts: ['0x0c5d91E097A22E1454987652d7cCdb825f1Ec462'],

  // Gnosis
  gnosisRpcs: [
    'https://rpc.gnosischain.com',
    'https://gnosis-pokt.nodies.app',
    'https://rpc.gnosis.gateway.fm',
    'https://gnosis.drpc.org',
    'https://rpc.ankr.com/gnosis',
    'https://gnosis.blockpi.network/v1/rpc/public',
  ],

  // Celo
  celoRpcs: [
    'https://rpc.ankr.com/celo',
    'https://1rpc.io/celo',
    'https://forno.celo.org',
    'https://celo.drpc.org',
  ],
};
