export const LIMITS = {
  wrapTxMin: 5,
  wrapTxMax: 10,

  wrapPercentMin: 10,
  wrapPercentMax: 20,

  approveTxMin: 5,
  approveTxMax: 10,

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
};

export const CONFIG_CONSTANTS = {
  rpc: 'https://rpc.ankr.com/taiko',
  approveContracts: [
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
};
