import { Contract, JsonRpcProvider, Wallet, ZeroAddress } from 'ethers';
import { IzumiABI } from '../abi';
import { execTx, retry } from '../../utils';
import { approve } from './utility';
import { MANTA_WETH_ADDRESS } from '../constants';
import { CONFIG_CONSTANTS } from '../../../deps/config';

const IZUMI_MANTA_ROUTER = '0x3EF68D3f7664b2805D4E88381b64868a56f88bC4';

const PROVIDER = new JsonRpcProvider(CONFIG_CONSTANTS.mantaRpcs[0]);

export type IzumiFeeTier = 400 | 500 | 2_000 | 3_000 | 10_000; // 0.04% | 0.05% | 0.2% | 0.3% | 1%

export async function izumiSwap(
  wallet: Wallet,
  tokenIn: string,
  tokenOut: string,
  fee: IzumiFeeTier,
  amountIn: bigint,
) {
  const router = new Contract(IZUMI_MANTA_ROUTER, IzumiABI, PROVIDER);

  const poolAddress = await retry<string>(() => router.getPool(tokenIn, tokenOut, fee));

  if (poolAddress === ZeroAddress) {
    console.log('Izumi: pool not found');
    return null;
  }

  if (tokenIn !== MANTA_WETH_ADDRESS) {
    const approveTx = await approve(wallet, tokenIn, IZUMI_MANTA_ROUTER, amountIn);

    if (!approveTx) {
      console.log('Izumi: approve failed');
      return null;
    }
  }

  const feeUint24 = fee.toString(16).padStart(6, '0');

  const path = `${tokenIn}${feeUint24}${tokenOut.slice(2)}`;
  const innerRecipient = tokenOut === MANTA_WETH_ADDRESS ? ZeroAddress : wallet.address;
  const deadline = Math.floor(Date.now() / 1000) + 60 * 5; // 5 minutes

  const minAmountOut = 0; // TODO: set min amount out

  const calls: string[] = [];

  const swapCall = router.interface.encodeFunctionData('swapAmount', [
    [path, innerRecipient, amountIn, minAmountOut, deadline],
  ]);

  calls.push(swapCall);

  if (tokenIn === MANTA_WETH_ADDRESS) {
    const wrapCall = router.interface.encodeFunctionData('refundETH', []);
    calls.push(wrapCall);
  }

  if (tokenOut === MANTA_WETH_ADDRESS) {
    const unwrapCall = router.interface.encodeFunctionData('unwrapWETH9', ['0', wallet.address]);
    calls.push(unwrapCall);
  }

  const txData = await retry(() =>
    router.multicall.populateTransaction(calls, {
      value: tokenIn === MANTA_WETH_ADDRESS ? amountIn : 0,
    }),
  );

  const receipt = await execTx(CONFIG_CONSTANTS.mantaRpcs, txData, wallet.privateKey);

  if (!receipt) {
    console.log('Izumi: swap failed');
    return null;
  }

  console.log('Izumi: swap successful');

  return receipt.hash;
}
