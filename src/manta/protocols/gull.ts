import { Contract, formatEther, formatUnits, Overrides, parseUnits, Wallet } from 'ethers';
import { GullABI } from '../abi';
import { MANTA_TOKENS, MANTA_WETH_ADDRESS, Token } from '../constants';
import { execTx, getRate, retry } from '../../utils';
import { CONFIG_CONSTANTS, LIMITS } from '../../../deps/config';
import { approve } from './utility';
import { mantaDB } from '../stats';

export const gullSwap = async (
  wallet: Wallet,
  tokenIn: Token,
  tokenOut: Token,
  amountIn: bigint,
) => {
  const router = new Contract('0x0c5d91E097A22E1454987652d7cCdb825f1Ec462', GullABI, wallet);

  const rates = await getRate([tokenIn.ticker, tokenOut.ticker]);

  if (!rates) {
    console.log('Error while getting token rate');
    return null;
  }

  const [tokenInRate, tokenOutRate] = rates;

  if (tokenIn.address !== MANTA_WETH_ADDRESS) {
    const approveTx = await approve(
      wallet,
      tokenIn.address,
      '0x0c5d91E097A22E1454987652d7cCdb825f1Ec462',
      amountIn,
    );

    if (!approveTx) {
      console.log('Gull: approve failed');
      return null;
    }

    console.log('Gull: approved');
  }

  const method =
    tokenIn.address === MANTA_WETH_ADDRESS
      ? 'swapExactETHForTokens'
      : tokenOut.address === MANTA_WETH_ADDRESS
      ? 'swapExactTokensForETH'
      : 'swapExactTokensForTokens';

  const amountOut = parseUnits(
    ((+formatUnits(amountIn, tokenIn.decimals) * tokenInRate) / tokenOutRate).toFixed(
      tokenOut.decimals,
    ),
    tokenOut.decimals,
  );
  const minAmountOut = (amountOut * BigInt((100 - LIMITS.slippage) * 10)) / 1000n;
  const tokenInChecked =
    tokenIn.address === MANTA_WETH_ADDRESS ? MANTA_WETH_ADDRESS : tokenIn.address;
  const tokenOutChecked =
    tokenOut.address === MANTA_WETH_ADDRESS ? MANTA_WETH_ADDRESS : tokenOut.address;
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes

  const overrides: Overrides = {
    value: tokenIn.address === MANTA_WETH_ADDRESS ? amountIn : 0n,
  };

  let route = [tokenInChecked, tokenOutChecked];

  if (
    [MANTA_WETH_ADDRESS, MANTA_TOKENS.USDC.address, MANTA_TOKENS.USDT.address].includes(
      tokenInChecked,
    ) &&
    [MANTA_WETH_ADDRESS, MANTA_TOKENS.USDC.address, MANTA_TOKENS.USDT.address].includes(
      tokenOutChecked,
    )
  ) {
    route = [tokenInChecked, MANTA_TOKENS.MANTA.address, tokenOutChecked];
  } else if (
    [MANTA_WETH_ADDRESS, MANTA_TOKENS.MUSD.address, MANTA_TOKENS.USDZ.address].includes(
      tokenInChecked,
    ) &&
    [MANTA_WETH_ADDRESS, MANTA_TOKENS.MUSD.address, MANTA_TOKENS.USDZ.address].includes(
      tokenOutChecked,
    )
  ) {
    route = [
      tokenInChecked,
      MANTA_TOKENS.MANTA.address,
      MANTA_TOKENS.USDT.address,
      tokenOutChecked,
    ];
  }

  const data = [amountIn, minAmountOut, route, wallet.address, deadline] as any;

  if (tokenIn.address === MANTA_WETH_ADDRESS) {
    data.shift();
  }

  const txData = await retry(() => router[method].populateTransaction(...data, overrides));

  const tx = await execTx(CONFIG_CONSTANTS.mantaRpcs, txData, wallet.privateKey);

  if (!tx) {
    console.log('Error while swapping on gull');
    return null;
  }

  const fee = parseFloat(formatEther(tx.fee));
  const totalFees = mantaDB.getAll(wallet.address).fees + fee;
  mantaDB.set(wallet.address, 'fees', totalFees);

  console.log(`Swapped ${tokenIn.ticker} to ${tokenOut.ticker} on gull`);

  return tx.hash;
};
