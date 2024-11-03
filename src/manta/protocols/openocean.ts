import { ContractTransaction, formatEther, formatUnits, JsonRpcProvider, Wallet } from 'ethers';
import { execTx, retry } from '../../utils';
import axios from 'axios';
import { CONFIG_CONSTANTS, LIMITS } from '../../../deps/config';
import { MANTA_WETH_ADDRESS, Token } from '../constants';
import { approve } from './utility';
import { mantaDB } from '../stats';

interface OpenOceanResponse {
  code: number;
  data: {
    chainId: number;
    inToken: {
      symbol: string;
      name: string;
      decimals: number;
      address: string;
    };
    outToken: {
      symbol: string;
      name: string;
      decimals: number;
      address: string;
    };
    inAmount: string;
    outAmount: string;
    estimatedGas: string;
    minOutAmount: string;
    from: string;
    to: string;
    value: string;
    gasPrice: string;
    data: string;
    gmxFee: string;
  };
}

export const openoceanSwap = async (
  wallet: Wallet,
  tokenIn: Token,
  tokenOut: Token,
  amountIn: number,
) => {
  const provider = new JsonRpcProvider(CONFIG_CONSTANTS.mantaRpcs[0]);

  const { gasPrice } = await retry(() => provider.getFeeData());

  const gasPriceGwei = Number(formatUnits(gasPrice!, 'gwei'));

  const url = `https://open-api.openocean.finance/v4/169/swap?inTokenAddress=${
    tokenIn.address === MANTA_WETH_ADDRESS
      ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
      : tokenIn.address
  }&outTokenAddress=${
    tokenOut.address === MANTA_WETH_ADDRESS
      ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
      : tokenOut.address
  }&amount=${amountIn}&slippage=${LIMITS.slippage}&account=${
    wallet.address
  }&gasPrice=${gasPriceGwei.toFixed(5)}`;

  const { data }: { data: OpenOceanResponse } = await retry(() => axios.get(url));

  if (data.code !== 200 || !data.data) {
    console.log('OpenOcean: error getting quote');
    return null;
  }

  const txData: ContractTransaction = {
    from: wallet.address,
    to: data.data.to,
    data: data.data.data,
    value: BigInt(data.data.value),
    gasLimit: (BigInt(data.data.estimatedGas) * 170n) / 100n,
  };

  if (tokenIn.address !== MANTA_WETH_ADDRESS) {
    const approveTx = await approve(
      wallet,
      tokenIn.address,
      data.data.to,
      BigInt(data.data.inAmount),
    );

    if (!approveTx) {
      console.log('OpenOcean: approve failed');
      return null;
    }

    console.log('OpenOcean: approved\n');
  }

  const tx = await execTx(CONFIG_CONSTANTS.mantaRpcs, txData, wallet.privateKey);

  if (!tx) {
    console.log('OpenOcean: error executing tx');
    return null;
  }

  const fee = parseFloat(formatEther(tx.fee));
  const totalFees = mantaDB.getAll(wallet.address).fees + fee;
  mantaDB.set(wallet.address, 'fees', totalFees);

  console.log(`Swapped ${tokenIn.ticker} to ${tokenOut.ticker} on openocean`);

  return tx.hash;
};
