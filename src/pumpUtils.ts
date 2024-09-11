import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { pumpDB } from './pumpStats';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { retry } from './utils';
import fs from 'fs';

const GLOBAL_PROVIDER = new JsonRpcProvider('https://rpc.scroll.io');

const RPCS = [
  'https://rpc.scroll.io',
  'https://scroll-mainnet.public.blastapi.io',
  'https://rpc.ankr.com/scroll',
  'https://scroll-mainnet.chainstacklabs.com',
  'https://scroll.api.onfinality.io/public',
  'https://scroll.drpc.org',
  'https://1rpc.io/scroll',
];

export function readRefs() {
  const keys = fs.readFileSync('./deps/refs.txt', 'utf8').replaceAll('\r', '').split('\n');

  keys.every((key, index) => {
    if (!(key.startsWith('0x') && key.length === 42)) {
      throw new Error(`Invalid key length at line ${index + 1}.`);
    }
    return true;
  });

  return keys;
}

export const rndKeyPair = (
  keys: string[],
  proxies: string[],
): { key: string; proxy: string; index: number } => {
  const rnd = Math.floor(Math.random() * keys.length);
  return { key: keys[rnd], proxy: proxies[rnd], index: rnd };
};

export const getSig = async (address: string, proxy: string) => {
  const agent = new HttpsProxyAgent(proxy, { rejectUnauthorized: false });

  try {
    const response: any = await Promise.race([
      axios.get(`https://api.scrollpump.xyz/api/Airdrop/GetSign?address=${address}`, {
        httpsAgent: agent,
        httpAgent: agent,
      }),
      new Promise((_, reject) => setTimeout(() => reject(false), 1000 * 90)),
    ]);

    if (response && response.data && response.data.success) {
      return response.data.data as { sign: string; amount: string };
    }

    pumpDB.set(address, true);
    return false;
  } catch (e: any) {
    console.log('Error while getting sig:', e.message);
    return false;
  }
};

export const isClaimed = async (key: string): Promise<boolean> => {
  const wallet = new Wallet(key, GLOBAL_PROVIDER);
  const contract = new Contract(
    '0xCe64dA1992Cc2409E0f0CdCAAd64f8dd2dBe0093',
    [
      {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'claimed',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    wallet,
  );

  try {
    const claimed = await contract.claimed(wallet.address);

    return claimed as boolean;
  } catch (e) {
    return false;
  }
};

export const claim = async (key: string, sign: string, amount: string, ref: string) => {
  const signers = RPCS.map((rpc) => {
    return new Wallet(key, new JsonRpcProvider(rpc));
  });
  const wallet = new Wallet(key, GLOBAL_PROVIDER);
  const contract = new Contract(
    '0xCe64dA1992Cc2409E0f0CdCAAd64f8dd2dBe0093',
    [
      {
        inputs: [
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
          {
            internalType: 'address',
            name: 'refUser',
            type: 'address',
          },
        ],
        name: 'claim',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
    wallet,
  );

  try {
    const feeData = await GLOBAL_PROVIDER.getFeeData();

    const gasLimit = await contract.claim.estimateGas(amount, sign, ref);

    const nonce = await GLOBAL_PROVIDER.getTransactionCount(wallet.address);

    const txData = await retry(
      () =>
        contract.claim.populateTransaction(amount, sign, ref, {
          gasPrice: (feeData.gasPrice! / 100n) * 150n,
          maxFeePerGas: undefined,
          maxPriorityFeePerGas: undefined,
          gasLimit: (gasLimit / 100n) * 130n,
          type: 0,
          nonce,
        }),
      2,
    );

    const txResponse = await retry(
      () => Promise.any(signers.map((signer) => signer.sendTransaction(txData))),
      2,
    );

    const receipt = await retry(
      async () => {
        const res = await GLOBAL_PROVIDER.getTransactionReceipt(txResponse.hash);
        if (!res) {
          throw new Error('Transaction not mined yet');
        }
        return res;
      },
      8,
      20,
    );

    if (!receipt) {
      return false;
    }

    console.log('Claimed on wallet: ', wallet.address);
    console.log(`TX: https://scrollscan.com/tx/${receipt.hash}`);

    return true;
  } catch (e: any) {
    console.log('Error while claiming:', e.message);
    return false;
  }
};
