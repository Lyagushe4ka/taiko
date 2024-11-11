import { Contract, JsonRpcProvider, parseEther, Wallet } from 'ethers';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { CONFIG_CONSTANTS } from '../../deps/config';
import { execTx, randomBetween, retry } from '../utils';
import axios from 'axios';
import { refuelAbi } from './refuelAbi';

export const refuelGnosis = async (wallet: Wallet, proxy: string, providers: JsonRpcProvider[]) => {
  const agent = new HttpsProxyAgent(proxy, { rejectUnauthorized: false });

  const routers = providers.map(
    (provider) => new Contract('0xbe51d38547992293c89cc589105784ab60b004a9', refuelAbi, provider),
  );

  const balance = await retry(() =>
    Promise.any(providers.map((provider) => provider.getBalance(wallet.address))),
  );

  if (!balance || balance < parseEther('0.03')) {
    console.log('Error while getting balance or balance is too low');
    return null;
  }

  const { data } = await retry(() =>
    axios.get('https://refuel.socket.tech/chains', { httpsAgent: agent, httpAgent: agent }),
  );

  if (!data.success) {
    console.log('Error while getting chains');
    return null;
  }

  const chains = data.result as Array<any>;

  const gnosisChain = chains.find((chain) => chain.chainId === 100);

  if (!gnosisChain || !gnosisChain.isSendingEnabled) {
    return null;
  }

  const polygonChain = (gnosisChain.limits as any[]).find((chain) => chain.chainId === 137);

  if (!polygonChain || !polygonChain.isEnabled) {
    return null;
  }

  const minAmount = BigInt(polygonChain.minAmount);
  const maxAmount = BigInt(polygonChain.maxAmount);

  if (balance < minAmount || balance > maxAmount) {
    console.log('Balance is not in range');
    return null;
  }

  const fee = randomBetween(0.004, 0.01, 3);

  const feeInWei = parseEther(fee.toString());

  const txData = await retry(() =>
    Promise.any(
      routers.map((router) =>
        router.depositNativeToken.populateTransaction(137, wallet.address, {
          value: balance - feeInWei,
        }),
      ),
    ),
  );

  const receipt = await execTx(CONFIG_CONSTANTS.gnosisRpcs, txData, wallet.privateKey);

  if (!receipt || receipt.status === 0) {
    console.log('Error while refueling from Gnosis');
    return null;
  }

  console.log('Refueled from Gnosis');

  return receipt.hash;
};
