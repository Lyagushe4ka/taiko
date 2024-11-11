import { ContractTransaction, Wallet } from 'ethers';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { execTx, makeApproveTx, retry } from '../utils';
import axios from 'axios';
import { CONFIG_CONSTANTS, LIMITS } from '../../deps/config';
import { ADDRESSES } from './constants';

export const swapCelo = async (wallet: Wallet, amount: bigint, proxy: string) => {
  const agent = new HttpsProxyAgent(proxy, { rejectUnauthorized: false });

  const { data } = await retry(() =>
    axios.get(
      `https://li.quest/v1/quote?fromChain=42220&toChain=42220&fromToken=EURA&toToken=CELO&fromAddress=${
        wallet.address
      }&fromAmount=${amount.toString()}&order=CHEAPEST&slippage=${LIMITS.slippage / 100}`,
      { httpsAgent: agent, httpAgent: agent },
    ),
  );

  if (!data.transactionRequest.data) {
    console.log('Error while getting swap data');
    return null;
  }

  const txData = data.transactionRequest as ContractTransaction;

  const approve = await makeApproveTx(
    wallet,
    ADDRESSES.CELO.token,
    txData.to,
    amount,
    CONFIG_CONSTANTS.celoRpcs,
  );

  if (!approve) {
    console.log('Error while approving token');
    return null;
  }

  console.log('EURA approved on CELO');

  const receipt = await execTx(CONFIG_CONSTANTS.celoRpcs, txData, wallet.privateKey);

  if (!receipt) {
    console.log('Error while swapping');
    return null;
  }

  return receipt.hash;
};
